var socket = io();
socket.on('helloworld', function(data) {
  console.log(data);
});

/** GLOBALS  */
// Keypressed
var k = {
  up: false,
  down: false,
  left: false,
  right: false
};

// Canvas width and height
var w = 800, h = 600;
var fps = 60;

/** END OF GLOBALS */

var canvas = document.getElementById('canvas');
canvas.width = w;
canvas.height = h;

/** Custom written wrapper for CanvasRenderingContext2D **/ 
var ctx = canvas.getContext('2d');

function circle(x, y, r){
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}
/** WRAPPER END */

socket.on('state', function(players) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'green';
  for (var id in players) {
    var player = players[id];
    circle(player.x, player.y, 10);
  }
});

// WASD to move
document.addEventListener('keydown', function(event) {
  switch (event.keyCode) {
    case 65: // A
      k.left = true;
      break;
    case 87: // W
      k.up = true;
      break;
    case 68: // D
      k.right = true;
      break;
    case 83: // S
      k.down = true;
      break;
  }
});

document.addEventListener('keyup', function(event) {
  switch (event.keyCode) {
    case 65: // A
      k.left = false;
      break;
    case 87: // W
      k.up = false;
      break;
    case 68: // D
      k.right = false;
      break;
    case 83: // S
      k.down = false;
      break;
  }
});

// New player has joined
socket.emit('new player');

// Send key info at fps
setInterval(function() {
  socket.emit('keypressed', k);
}, 1000 / fps);