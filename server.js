const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = 3000;

app.set('port', port);

app.use('/', express.static(__dirname + '/'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});

// Stores player info
var players = {};

// sockets
io.on('connection', function(socket) {
  socket.on('new player', function() {
    players[socket.id] = {
      x: 400,
      y: 300
    };
  });
  socket.on('keypressed', function(k) {
    var player = players[socket.id] || {};
    if (k.left) {
      player.x -= 3;
    }
    if (k.up) {
      player.y -= 3;
    }
    if (k.right) {
      player.x += 3;
    }
    if (k.down) {
      player.y += 3;
    }
  });
});

// Send player states back at 60fps
setInterval(function() {
  io.sockets.emit('state', players);
}, 1000 / 60);

/**
  setInterval(function() {
    io.sockets.emit('helloworld', 'Send this every second!');
  }, 1000);
**/

var boardHeight = 10
var boardWidth = 10
var numMines = 12
var adjacent = [1,-1,boardWidth,-boardWidth,boardWidth+1,boardWidth-1,-boardWidth+1,-boardWidth-1]

function revealTile(board,tile){
  if (board[tile] < 9){ // checking if already revealed, and if it is a mine
    board[tile] += 10; // we will use two digit numbers to symbolize revealed tiles
    if (board[tile] == 10){ // is a blank square?
      for (i in adjacent.slice(0,3)){
        revealTile(board,tile + i) // repeat the process with adjacent squares, ik not the best approach, but it should work
      }
    }
  }
}

function generateBoard(w,h,n){
  var board = [];
  for (i=0; i < h*w; i++){
    board.push(0); // creating the elements of the array
  }

  for (i=0; i < n; i++){
    board[Math.floor(Math.random() * h*w)] = 9; // 9 will represent a mine
    for (x in adjacent){
      if (board[x+i] != 9){
        board[x+i] += 1; // add a 1 to adjacent tiles since there is another mine 
      }
    }
  }

  return board;
}

function tileClicked(board,tile){
  if (board[tile] == 9){
    // hit a mine
  } else {
    // just show the tile
    revealTile(board,tile)
  }
}

function tileFlagged(board,tile){
  if (board[tile] == 9){
    board[tile] = 19 // mine is flagged
  }
}