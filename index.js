const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = 6666;

app.set('port', port);

app.use('/', express.static(__dirname + '/'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});

// Stores games info
var games = {};
// var firstClick = true

// Returns pseudorandom float in range [a, b)
function random(a, b){
  return Math.random() * (b - a) + a;
}

// the 8 adjacent integer coordinates of the origin
const cs = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

// check how much bombs a safe spot has around
function check (i, z, m, s){
    var bmbn = 0;
    for (var k = 0; k < cs.length; k++){
        var coor = [cs[k][0] + i, cs[k][1] + z];
        if (coor[0] >= s || coor[1] >= s || coor[0] < 0 || coor[1] < 0){
            continue;
        }
        if (m[coor[0]][coor[1]] === 1){
            bmbn ++;
        }
    }
    
    return bmbn;
}

function generateGame(boardSize, b, id, w, h){
  // you can never have too many bombs
  numMines = Math.min(b, Math.floor(boardSize * boardSize * 1/3)); 
  
  // m is the actual state of each tile, c is what the player will see
  // m[][] 0 = safe, 1 = bomb
  // c[][] -2 = flagged, -1 = unknown, other = bomb# 
  var bombMap = [];
  var clientMap = [];
  var bombn = [];
  
  /**var nTiles = random(7, 20);
  var blanks = [];
  blanks.push([x,y]);

  for (var i = 0; i < nTiles; i++){
    var info = cs[random(0,3)]; // random adjacent tile
    var rng = random(0, blanks.length());
    var xPlus = info[0];
    var yPlus = info[1];
    var newBlank = [blanks[rng][0] + xPlus, blanks[rng][1] + yPlus]; // new blank tile
    if (blanks.includes(newBlank)){ // check if already a blank
      i--;
      continue;
    } else {
      blanks.push([blanks[rng][0] + xPlus, blanks[rng][1] + yPlus]);
    }
  }**/

  // initially all m = safe, all c = unknown
  for (var i = 0; i < boardSize; ++i){
      bombMap.push([]); 
      clientMap.push([]);
      bombn.push([]); 
      for (var k = 0; k < boardSize; ++k){
        bombMap[i].push(0);
        bombn[i].push(0);
        clientMap[i].push(-1);
      }
  }

  // Create b random different bombs (bs) and change corresponding m to 1 
  var bombPos = [];
  for (var i = 0; i < numMines; i++){
      var bmb = [Math.floor(random(0, boardSize)), Math.floor(random(0, boardSize))];
      var occupied = false;
      for (var z = 0; z < bombPos.length; z++){
          /*if (z < blanks.length() && bmb[0] === blank[z][0] && bmb[1] === blank[z][1]){
            i--; 
            a = true;
            break;
          }*/

          if (bmb[0] === bombPos[z][0] && bmb[1] === bombPos[z][1]){
            // check if already a bomb
              i--;
              occupied = true;
              break;
          }
      }
      if (occupied){
          continue;
      }
      
      bombPos.push(bmb);
      bombMap[bmb[0]][bmb[1]] = 1;
  }
  
  // The 2d matrix info about the number of bombs around a tile
  for (var i = 0; i < boardSize; ++i){
      for (var k = 0; k < boardSize; ++k){
        bombn[i][k] = check(i, k, bombMap, boardSize);
      }
  }

  // return an object containing the info for this entire game
  return {
    id: id,
    width: w,
    height: h,
    numMines: numMines, //b --> numMines
    boardSize: boardSize, //s --> boardSize
    bombMap: bombMap, //m --> bombMap
    clientMap: clientMap, //c --> clientMap
    bombPos: bombPos, //bs --> bombPos
    bombn: bombn,
    flags: 0, //pb --> flags
    scene: 0,
    lose: false
  };
}

function checkWin(id){
  var game = games[id];
    for (var i = 0; i < game.bombPos.length; ++i){
        if (game.clientMap[game.bombPos[i][0]][game.bombPos[i][1]] !== -2){
            return false;
        }
    }
    
    game.scene = 2;
    return true;
}

function click (id, mouseY, mouseX, mouseB, real = true){
    // real is if the click function being called is actually from the click (true) vs a recursion reveal
    /**if (firstClick == true){
      firstClick = false    // generating a new board on first click  
      games[socket.id] = generateGame(15, 40, socket.id, dimensions.w, dimensions.h, z, i);
    }**/
    var game = games[id];

    // m is the actual state of each tile, c is what the player will see
    // m[][] 0 = safe, 1 = bomb
    // c[][] -2 = flagged, -1 = unknown, other = bomb# 
    // w = 1 left click, 0 right click 

    // actual tile state
    switch(game.bombMap[mouseY][mouseX]){
        // safe tile
        case 0:
            // if left clicked
            if (mouseB == 1){
              if ((!real && game.clientMap[mouseY][mouseX] < 0) || (real && game.clientMap[mouseY][mouseX] == -1)){
                if (game.clientMap[mouseY][mouseX] == -2){
                  -- game.flags;
                }
                game.clientMap[mouseY][mouseX] = game.bombn[mouseY][mouseX];
                if (game.bombn[mouseY][mouseX] === 0){
                    for (var k = 0; k < cs.length; ++k){
                        var coor = [cs[k][0] + mouseY, cs[k][1] + mouseX];
                        if (coor[0] >= game.boardSize || coor[1] >= game.boardSize || coor[0] < 0 || coor[1] < 0){
                          continue;
                        }
                        click(id, coor[0], coor[1], 1, false);
                    }
                }
              }
            }
            // right clicked
            else if (game.flags < game.numMines){
                if (game.clientMap[mouseY][mouseX] == -1){
                  // flag tile
                  game.clientMap[mouseY][mouseX] = -2;
                  ++ game.flags;
                }
                else if (game.clientMap[mouseY][mouseX] == -2){
                  // unflag tile (unknown state)
                  game.clientMap[mouseY][mouseX] = -1;
                  -- game.flags;
                }
            }
        break;
        // bomb tile
        case 1:
            // unknown
            if (game.clientMap[mouseY][mouseX] === -1){
                // right clicked
                if (mouseB === 1){
                    // loss here
                    game.scene = 2;
                    game.lose = true;
                    game.clientMap[mouseY][mouseX] = -3;
                }
                // left clicked
                if (mouseB === 0 && game.flags < game.numMines){
                    // flag tile
                    game.clientMap[mouseY][mouseX] = -2;
                    ++ game.flags;
                }
            }
            // flagged & left click -> unflag (unknown)
            else if (mouseB === 0){
                game.clientMap[mouseY][mouseX] = -1;
                -- game.flags;
            }
    }
}

// sockets
io.on('connection', function(socket) {
  socket.on('disconnect', function() {
    delete games[socket.id];
  });
  socket.on('new player', function(dimensions) {
    // dimensions.w & dimensions.h 
    // perhaps generate size and bomb # here
    delete games[socket.id];
    games[socket.id] = generateGame(15, 40, socket.id, dimensions.w, dimensions.h);
    //console.log(games[socket.id]);
  });
  socket.on('mouse', function(mouse) {
    if (!mouse.clicked){return;}
    var id = Object.keys(games)[Object.keys(games).length - 1];
    // var id = socket.id;
    var game = games[id];
    if (game.scene == 0){
      game.scene = 1;
    }
    if (game.scene == 1){
      click(id, Math.floor(mouse.y * game.boardSize / game.height), Math.floor(mouse.x * game.boardSize / game.width), mouse.button == 2 ? 0 : 1);  
    }
    checkWin(id);
  });
});

// Send player states back at 60fps
setInterval(function() {
  io.sockets.emit('state', games);
}, 1000 / 60);

/**
// Tile 
var boardHeight = 10;
var boardWidth = 10;
var numMines = 12;
var adjacent = [1,-1,boardWidth,-boardWidth,boardWidth+1,boardWidth-1,-boardWidth+1,-boardWidth-1];
var minePositions = [];

function revealTile(board,tile){
  if (board[tile] < 9){ // checking if already revealed, and if it is a mine
    board[tile] += 10; // we will use two digit numbers to symbolize revealed tiles
    if (board[tile] == 10){ // is a blank square?
      for (i in adjacent.slice(0,3)){
        revealTile(board,tile + i) // repeat the process with adjacent squares, ik not the best approach, but it should work
        // I think it is the best approach tbh
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
    var random = Math.floor(Math.random() * h*w);
    board[random] = 9; // 9 will represent a mine
    minePositions.push(random);
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
    board[tile] = 19; // mine is flagged

    for (i in minePositions){
      if (i == 9){
        return
      }
    }

    // mines have all been flagged
  }
}
**/