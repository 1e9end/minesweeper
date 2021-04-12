var socket = io();

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

// Mouse
var mouse = {
  x: 0,
  y: 0,
  clicked: false,
  button: false
}

socket.on('state', function(games) {
  var map = games[socket.id];
  function setup(){
    createCanvas(w, h);
  }

  function draw(){
      background(0);
      textAlign(CENTER, CENTER);
      textSize(20);
      var m = map.m;
      var c = map.c;
      
      var ww = w/map.s;
      var hh = h/map.s;

      for (var y = 0; y < m.length; ++y){
          for (var x = 0; x < m[y].length; ++x){
              fill(0, 0, 0, 80);
              if (c[y][x] >= 0){
                  fill(0, 0, 0, 50);
              }
              rect(x * ww, y * hh, ww, hh);
              if (c[y][x] > 0){
                  fill(0);
                  text(c[y][x], x * ww +  1/2 * ww, 1/2 * hh + y * hh); 
              }
              if (c[y][x] === -2){
                  fill(0);
                  rect(x * ww + ww/5, y * hh + hh/5, ww /10, hh * 3/5);
                  fill(255, 0, 0);
                  triangle(x * ww + ww/5, y * hh + hh/5, x * ww + ww/5, y * hh + hh * 3/5, x * ww + ww * 4/5, y * hh + hh * 2/5);
              }
              if (c[y][x] === -3){
                  fill(0);
                  ellipse(x * ww +  1/2 * hh, 1/2 * hh + y * hh, ww * 4/5, hh * 4/5);
              }
          }
      }  
      
      var scene = map.scene;
      if (scene === 0){
          textSize(100);
          fill(0);
          text("Minesweeper", w/2, h/3);
          textSize(40);
          text("Click somewhere (hopefully\nnot a bomb) to start", w/2, h * 2/3);
      }
      if (scene === 2){
          textSize(100);
          fill(0);
          if (lose){
              text("YoU lOsT", w/2, h/3);
              textSize(40);
              text("Better luck next time!\n Restart to replay", w/2, h * 2/3);
          }
          else{
              text("YoU wOn", w/2, h/3);
          }
      }
      
      mouse.clicked = false;
  };

  function mouseClicked(){
      mouse.clicked = true;
      mouse.button = mouseButton;
      mouse.x = mouseX;
      mouse.y = mouseY;
  };
});

// Best browser performance requestAnimationFrame
window.reqAnimationFrame = (function(callback){
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000/fps);
    };
})();

function sendInfo(){
    socket.emit('mouse', mouse);
    
    window.reqAnimationFrame(sendInfo, 1000/fps);
}

window.addEventListener("load", function(){
  socket.emit('new player');
}, false);

window.addEventListener("load", sendInfo, false);