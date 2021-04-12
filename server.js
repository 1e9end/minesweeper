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

// Stores games info
var games = {};

// Returns pseudorandom float in range [a, b)
function random(a, b){
  return Math.random() * (b - a) + a;
}

// the 8 ajacent integer coordinates of the origin
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

function generateGame(s, b, id){
  // Cant have too many bombs
  b = Math.min(b, Math.floor(s * s * 1/3)); 

  // m is the actual state of each tile, c is what the player will see
  // m[][] 0 = safe, 1 = bomb
  // c[][] -2 = flagged, -1 = unknown, other = bomb# 
  var m = [];
  var c = [];
  var bombn = [];

  // initially all m = safe, all c = unknown
  for (var i = 0; i < s; ++i){
      m.push([]); 
      c.push([]);
      bombn.push([]); 
      for (var k = 0; k < s; ++k){
          m[i].push(0);
          bombn[i].push(0);
          c[i].push(-1);
      }
  }

  // Create b random different bombs (bs) and change corresponding m to 1 
  var bs = [];
  for (var i = 0; i < b; i++){
      var bmb = [Math.floor(random(0, s)), Math.floor(random(0, s))];
      var a = false;
      for (var z = 0; z < bs.length; z++){
          if (bmb[0] === bs[z][0] && bmb[1] === bs[z][1]){
              i--;
              a = true;
              break;
          }
      }
      if (a){
          continue;
      }
      
      bs.push(bmb);
      m[bmb[0]][bmb[1]] = 1;
  }
  
  // The 2d matrix info about the number of bombs around a tile
  for (var i = 0; i < s; ++i){
      for (var k = 0; k < s; ++k){
        bombn[i][k] = check(i, k, m, s);
      }
  }

  // return an object containing the info for this entire game
  return {
    id: id,
    b: b,
    s: s,
    m: m, 
    c: c,
    bs: bs,
    bombn: bombn,
    pb: 0,
    scene: 0,
    lose: false
  };
}

function checkWin(id){
  var game = games[id];
    for (var i = 0; i < game.bs.length; ++i){
        if (game.c[game.bs[i][0]][game.bs[i][1]] !== -2){
            return false;
        }
    }
    
    game.scene = 2;
    return true;
}

function click (id, i, z, w){
    var game = games[id];

    // m is the actual state of each tile, c is what the player will see
    // m[][] 0 = safe, 1 = bomb
    // c[][] -2 = flagged, -1 = unknown, other = bomb# 
    // w = 1 left click, 0 right click 

    // actual tile state
    switch(game.m[i][z]){
        // safe tile
        case 0:
            // displayed state
            switch(game.c[i][z]){
                // unknown
                case -1: 
                    // reveal tile
                    if (w === 1){
                        game.c[i][z] = game.bombn[i][z];
                        if (game.bombn[i][z] === 0){
                            for (var k = 0; k < cs.length; ++k){
                                var coor = [cs[k][0] + i, cs[k][1] + z];
                                if (coor[0] >= game.s || coor[1] >= game.s || coor[0] < 0 || coor[1] < 0){
                                  continue;
                                }
                                click(id, coor[0], coor[1], 1);
                            }
                        }
                    }
                    else {
                        // flag tile
                        game.c[i][z] = -2;
                    }
                break;
                // flagged
                case -2:
                    // unflag tile (unknown state)
                    if (w === 0){
                        game.c[i][z] = -1;
                        -- game.pb;
                    }
            }
        break;
        // bomb tile
        case 1:
            // unknown
            if (game.c[i][z] === -1){
                // right clicked
                if (w === 1){
                    // loss here
                    game.scene = 2;
                    game.lose = true;
                    game.c[i][z] = -3;
                }
                // left clicked
                if (w === 0 && game.pb < game.b){
                    // flag tile
                    game.c[i][z] = -2;
                    ++ game.pb;
                }
            }
            // flagged & left click -> unflag (unknown)
            else if (w === 0){
                game.c[i][z] = -1;
                -- game.pb;
            }
    }
}

// sockets
io.on('connection', function(socket) {
  socket.on('new player', function() {
    games[socket.id] = generateGame(15, 40, socket.id);
  });
  socket.on('mouseclicked', function(mouse) {
    if (!mouse.clicked){return;}
    var game = games[socket.id];
    if (game.scene == 0){
      game.scene = 1;
    }
    if (game.scene == 1){
      click(socket.id, Math.floor(mouse.y * game.s / height), Math.floor(mouse.x * game.s / width), mouse.button === RIGHT ? 0 : 1);  
    }
    checkWin(socket.id);
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