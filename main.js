var socket = io();

/** GLOBALS  */
// Mouse
var mouse = {
  x: 0,
  y: 0,
  clicked: false,
  button: false
}

// Canvas width and height
var w = 800, h = 800;
var fps = 60;

/** END OF GLOBALS */

var canvas = document.getElementById('canvas');
canvas.width = w;
canvas.height = h;

/** Custom written wrapper for CanvasRenderingContext2D **/ 
var ctx = canvas.getContext('2d');

function fill(r = 0, g = r, b = r, a = 255){
  ctx.fillStyle = `rgb(${r}, ${g}, ${b}, ${a})`;
}

function noStroke(){
  ctx.strokeStyle = "rgb(0, 0, 0, 0)";
}

function stroke(r = 0, g = r, b = r, a = 255){
  ctx.strokeStyle = `rgb(${r}, ${g}, ${b}, ${a})`;
}

function rect(x, y, w, h){
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function background(r, g, b){
  ctx.clearRect(0, 0, w, h);
  fill(r, g, b);
  rect(0, 0, w, h);
}

function circle(x, y, r){
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

function ellipse(x, y, w, h){
  ctx.ellipse(x, y, w/2, h/2, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

function triangle(x1, y1, x2, y2, x3, y3){
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

function quad(x1, y1, x2, y2, x3, y3, x4, y4){
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

function textSize(n){
  ctx.font = `${n}px sans-serif`;
}

function text(t, x, y){
  ctx.fillText(t, x, y);
}
/** WRAPPER END */

socket.on('state', function(games) {
  // var map = games[socket.id];
  // Not working cuz we need to create socket 'rooms' first in the current case there's an error the client recieves the state before their game gets generated on the server resulting in an undefined game when reading from the client
  var map = games[Object.keys(games)[Object.keys(games).length - 1]];
  background(255);
  ctx.textBaseline = 'middle';
  ctx.textAlign = "center";

  var bombMap = map.bombMap;
  var clientMap = map.clientMap;
  
  var ww = w/map.boardSize;
  var hh = h/map.boardSize;

  const sc = 2/15;
  ctx.font = `bold 20px sans-serif`;
  for (var y = 0; y < bombMap.length; ++y){
      for (var x = 0; x < bombMap[y].length; ++x){
        var cmv = clientMap[y][x];
        fill(220);
        stroke(222);
        if (cmv >= 0 || cmv == -3){
            fill(233);
        }
        rect(x * ww, y * hh, ww, hh);
        if (cmv != -3 && cmv < 0){
          fill(230);
          quad(x * ww, y * hh, x * ww + ww * sc, y * hh + hh * sc, x * ww + ww * sc, y * hh + hh * (1 - sc), x * ww, y * hh + hh);
          fill(240);
          quad(x * ww, y * hh, x * ww + ww, y * hh, x * ww + ww * (1 - sc), y * hh + hh * sc, x * ww + ww * sc, y * hh + hh * sc);
          fill(179);
          quad(x * ww + ww, y * hh, x * ww + ww * (1 - sc), y * hh + hh * sc, x * ww + ww * (1 - sc), y * hh + hh * (1 - sc), x * ww + ww, y * hh + hh);
          fill(171);
          quad(x * ww, y * hh + hh, x * ww + ww * sc, y * hh + hh * (1 - sc), x * ww + ww * (1 - sc), y * hh + hh * (1 - sc), x * ww + ww, y * hh + hh);
        }

        if (cmv > 0){
            switch(cmv){
              case 1:
                fill(0, 52, 222);
              break;
              case 2:
                fill(42, 126, 40);
              break;
              default:
                fill(135, 29, 33);
            }
            text(cmv, x * ww +  1/2 * ww, 1/2 * hh + y * hh); 
        }
        if (cmv == -2){
            fill(0);
            rect(x * ww + ww/5, y * hh + hh/5, ww /10, hh * 3/5);
            fill(255, 0, 0);
            triangle(x * ww + ww/5, y * hh + hh/5, x * ww + ww/5, y * hh + hh * 3/5, x * ww + ww * 4/5, y * hh + hh * 2/5);
        }
        if (cmv == -3){
            fill(0);
            circle(x * ww +  1/2 * hh, 1/2 * hh + y * hh, Math.min(ww, hh) * 1/5);
        }
      }
  }  
  
  var scene = map.scene;
  if (scene == 0){
      textSize(100);
      fill(0);
      text("Minesweeper", w/2, h/3);
      textSize(40);
      text("Click to start", w/2, h * 2/3);
  }
  if (scene == 2){
      textSize(100);
      fill(0);
      if (map.lose){
          text("Defeat...", w/2, h/3);
          textSize(40);
          text("Reload to try again", w/2, h * 2/3);
      }
      else{
          text("Victory!", w/2, h/3);
      }
  }
  canvas.onmouseup = function(e){
    mouse.clicked = true;
    mouse.button = e.button;
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    console.log('clicked');
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
    if (mouse.clicked){
      mouse.clicked = false;
      console.log('sent a clicked');
    }
    window.reqAnimationFrame(sendInfo, 1000/fps);
}

socket.emit('new player', {w: w, h: h});
window.addEventListener("load", sendInfo, false);

/**
socket.emit('new player', {w: w, h: h});

setInterval(function() {
  socket.emit('mouse', mouse);
}, 1000 / fps);
**/