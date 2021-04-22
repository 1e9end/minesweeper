var socket = io();

/** GLOBALS  */
// Mouse
var mouse = {
  x: 0,
  y: 0,
  clicked: false,
  button: false
}

// Dimensions of the window
var tabWidth = window.innerWidth;
var tabHeight = window.innerHeight;

// Board width and height
var dim = Math.min((tabWidth - 100)/2 - 50, tabHeight - 150);
var w = dim, h = dim;

// Scale actual canvas width/height here to leave room for opponent board/ UI stats
var windowWidth = 2 * w + 100, windowHeight = h + 100;
var fps = 60;

// Server info
var createdRoom = false;
var room;
var other;

// 0 = no game, 1 = matchmaking, 2 = in game
var state = 0;
/** END OF GLOBALS */

var canvas = document.getElementById('canvas');
canvas.width = windowWidth;
canvas.height = windowHeight;

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
  ctx.clearRect(0, 0, windowWidth, windowHeight);
  fill(r, g, b);
  stroke(255);
  rect(0, 0, windowWidth, windowHeight);
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

function translate(x, y){
  ctx.translate(x, y);
}

function resetMatrix(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
/** WRAPPER END */

const sc = 2/15;

function drawBoard(clientMap, ww, hh){
  for (var y = 0; y < clientMap.length; ++y){
    for (var x = 0; x < clientMap[y].length; ++x){
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
}

socket.on('madeRoom', function(roomInfo){
  room = roomInfo.room;
  other = (roomInfo.p1 == socket.id ? roomInfo.p2 : roomInfo.p1);
  state = 2;
  console.log(socket.id + "successfully joined a game " + room + " with " + other);
});

socket.on('noRoom', function(){

});

socket.on('endGame', function(){
  room = null;
  other = null;
  createdRoom = false;
  state = 0;
  document.getElementById("menu").style.display = "block";
});

ctx.textBaseline = "middle";
ctx.textAlign = "center";

socket.on('state', function(players) {
  var p1 = players[socket.id];
  var p2 = players[other];
  background(255);
  
  var ww = w/p1.boardSize;
  var hh = h/p1.boardSize;
  
  ctx.font = `bold ${tabWidth/80}px sans-serif`;

  fill(0);
  text("Flags placed: " + p1.flags, w/2, (windowHeight - h)/2);
  text("Room: " + room, windowWidth/2, (windowHeight - h)/2)
  text("Opponent flags placed: " + p2.flags, windowWidth - w/2, (windowHeight - h)/2);
  translate(0, 100);
  drawBoard(p1.clientMap, ww, hh);
  if (p1.freeze){
    ctx.globalAlpha = 0.2;
    fill(0, 0, 255, 100);
    rect(0, 0, w, h);
    ctx.globalAlpha = 1;
    fill(255);
    textSize(dim/10);
    text("Frozen", w/2, h/3);
    textSize(dim/20);
    text(Math.ceil((15000 - p1.freezeTimer)/1000) + " seconds remaining", w/2, h * 2/3);
  }

  var scene = p1.scene;
  if (scene == 0){
      textSize(dim/10);
      fill(0);
      text("Minesweeper", w/2, h/3);
      textSize(dim/20);
      text("Click to start", w/2, h * 2/3);
  }
  if (scene == 2){
      textSize(dim/10);
      fill(0);
      if (p1.lose == 1){
          text("Defeat...", w/2, h/2);
      }
      else{
          text("Victory!", w/2, h/2);
      }
  }

  translate(w + 100, 0);
  for (var y = 0; y < p2.greenMap.length; ++y){
    for (var x = 0; x < p2.greenMap[y].length; ++x){
      var cmv = p2.greenMap[y][x];
      if (cmv){
        fill(0, 255, 0);
        rect(x * ww, y * hh, ww, hh);
        continue;
      }

      fill(220);
      stroke(222);
      rect(x * ww, y * hh, ww, hh);
      fill(230);
      quad(x * ww, y * hh, x * ww + ww * sc, y * hh + hh * sc, x * ww + ww * sc, y * hh + hh * (1 - sc), x * ww, y * hh + hh);
      fill(240);
      quad(x * ww, y * hh, x * ww + ww, y * hh, x * ww + ww * (1 - sc), y * hh + hh * sc, x * ww + ww * sc, y * hh + hh * sc);
      fill(179);
      quad(x * ww + ww, y * hh, x * ww + ww * (1 - sc), y * hh + hh * sc, x * ww + ww * (1 - sc), y * hh + hh * (1 - sc), x * ww + ww, y * hh + hh);
      fill(171);
      quad(x * ww, y * hh + hh, x * ww + ww * sc, y * hh + hh * (1 - sc), x * ww + ww * (1 - sc), y * hh + hh * (1 - sc), x * ww + ww, y * hh + hh);
    }
  } 
  if (p2.freeze){ 
    ctx.globalAlpha = 0.2;
    fill(0, 0, 255, 100);
    rect(0, 0, w, h);
    ctx.globalAlpha = 1;
    fill(255);
    textSize(dim/10);
    text("Frozen", w/2, h/3);
    textSize(dim/20);
    text(Math.ceil((15000 - p2.freezeTimer)/1000) + " seconds remaining", w/2, h * 2/3);
  }
  resetMatrix();
});

canvas.onmouseup = function(e){
  mouse.clicked = true;
  mouse.button = e.button;
  mouse.x = e.offsetX;
  mouse.y = e.offsetY + h - windowHeight;
};

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}

canvas.onclick = function(){
  if (state == 1 && createdRoom){
    copyTextToClipboard(createdRoom);
  }
};

// Best browser performance requestAnimationFrame
window.reqAnimationFrame = (function(callback){
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000/fps);
    };
})();

function updateClient(){
    switch(state){
      case 1: 
        background(255);
        fill(0);
        textSize(20);
        if (createdRoom){
          text('Created a room!', windowWidth/2, windowHeight/2);
          text('Room code to join (click to copy): ' + createdRoom, windowWidth/2, windowHeight * 2/3);
        }
        else{
          text('Waiting for second player...', windowWidth/2, windowHeight/2);
        }
      break;
      case 2:
        socket.emit('clicked', mouse);
    }
    if (mouse.clicked){
      mouse.clicked = false;
    }
    window.reqAnimationFrame(updateClient, 1000/fps);
}

function matchMake(){
  if (state != 0){
    return;
  }
  var roomCode = document.getElementById("roomInput").value;
  socket.emit('matchmake', {room: roomCode, w: w, h: h});
  document.getElementById("menu").style.display = "none";
  state = 1;
}

function makeRoom(){
  if (state != 0){
    return;
  }
  socket.emit('makeRoom', {w: w, h: h});
  createdRoom = socket.id;
  console.log(createdRoom);
  document.getElementById("menu").style.display = "none";
  state = 1;
}

//matchMake();
window.addEventListener("load", updateClient, false);