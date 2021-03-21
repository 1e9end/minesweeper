var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

var canvas = document.getElementById('canvas');
canvas.width = 800;
canvas.height = 600;

/** Custom written wrapper for CanvasRenderingContext2D **/ 
function circle(x, y, r){
  context.beginPath();
  context.arc(x, y, r, 0, 2 * Math.PI);
  context.fill();
}

var ctx = canvas.getContext('2d');
socket.on('state', function(players) {
  ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle = 'green';
  for (var id in players) {
    var player = players[id];
    circle(player.x, player.y, 10);
  }
});