const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = 4000;

app.set('port', port);

app.use('/', express.static(__dirname + '/'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});

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

function generateGame(boardSize, b){
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

function Game(p1, p2, id){
  // Create a game
  var boardSize = 15;
  var createdGame = generateGame(boardSize, 40);
  this.roomInfo = {
    room: id,
    p1: p1.id,
    p2: p2.id
  };
  // Info that is same for both players here
  this.gameInfo = {
    boardSize: boardSize,
    numMines: createdGame.numMines,
    bombMap: createdGame.bombMap,
    bombPos: createdGame.bombPos,
    bombn: createdGame.bombn
  };
  // Player specific client info here
  this.players = {};
  this.players[p1.id] = {
    boardSize: boardSize,
    width: p1.w,
    height: p1.h,
    // JSON parse, stringify deep cloning works here since no undefined or functional properties
    clientMap: JSON.parse(JSON.stringify(createdGame.clientMap)),
    flags: 0,
    scene: 0,
    lose: false
  };
  this.players[p2.id] = {
    boardSize: boardSize,
    width: p2.w,
    height: p2.h,
    clientMap: JSON.parse(JSON.stringify(createdGame.clientMap)),
    flags: 0,
    scene: 0,
    lose: false
  };
}

Game.prototype = {
  click: function(id, mouseY, mouseX, mouseB, real = true){
      // real is if the click function being called is actually from the click (true) vs a recursion reveal
      let c = this.players[id];
      // actual tile state
      switch(this.gameInfo.bombMap[mouseY][mouseX]){
          // safe tile
          case 0:
              // if left clicked
              if (mouseB == 1){
                if ((!real && c.clientMap[mouseY][mouseX] < 0) || (real && c.clientMap[mouseY][mouseX] == -1)){
                  if (c.clientMap[mouseY][mouseX] == -2){
                    -- c.flags;
                  }
                  c.clientMap[mouseY][mouseX] = this.gameInfo.bombn[mouseY][mouseX];
                  if (this.gameInfo.bombn[mouseY][mouseX] === 0){
                      for (var k = 0; k < cs.length; ++k){
                          let coor = [cs[k][0] + mouseY, cs[k][1] + mouseX];
                          if (coor[0] >= c.boardSize || coor[1] >= c.boardSize || coor[0] < 0 || coor[1] < 0){
                            continue;
                          }
                          this.click(id, coor[0], coor[1], 1, false);
                      }
                  }
                }
              }
              // right clicked
              else if (c.flags < this.gameInfo.numMines){
                  if (c.clientMap[mouseY][mouseX] == -1){
                    // flag tile
                    c.clientMap[mouseY][mouseX] = -2;
                    ++ c.flags;
                  }
                  else if (c.clientMap[mouseY][mouseX] == -2){
                    // unflag tile (unknown state)
                    c.clientMap[mouseY][mouseX] = -1;
                    -- c.flags;
                  }
              }
          break;
          // bomb tile
          case 1:
              // unknown
              if (c.clientMap[mouseY][mouseX] === -1){
                  // right clicked
                  if (mouseB === 1){
                      // loss here
                      c.scene = 2;
                      c.lose = true;
                      c.clientMap[mouseY][mouseX] = -3;
                  }
                  // left clicked
                  if (mouseB === 0 && c.flags < this.gameInfo.numMines){
                      // flag tile
                      c.clientMap[mouseY][mouseX] = -2;
                      ++ c.flags;
                  }
              }
              // flagged & left click -> unflag (unknown)
              else if (mouseB === 0){
                  c.clientMap[mouseY][mouseX] = -1;
                  -- c.flags;
              }
      }
  },
  checkWin: function(id){
    let b = this.gameInfo.bombPos;
    let c = this.players[id].clientMap;

    for (var i = 0; i < b.length; ++i){
        if (c[b[i][0]][b[i][1]] !== -2){
            return false;
        }
    }
    
    this.players[id].scene = 2;
    return true;
  },
  update: function(id, mouse){
    let c = this.players[id];
    if (mouse.x >= c.width || mouse.y >= c.height){
      return;
    }
    if (c.scene == 0){
      c.scene = 1;
    }
    if (this.players[id].scene == 1){
      let s = this.gameInfo.boardSize;
      this.click(id, Math.floor(mouse.y * s / c.height), Math.floor(mouse.x * s / c.width), mouse.button == 2 ? 0 : 1);  
    }
    this.checkWin(id);
  },
  emit: function(){
    io.to(this.roomInfo.room).emit('state', this.players);
  },
  madeRoom: function(){
    io.to(this.roomInfo.room).emit('madeRoom', this.roomInfo);
  },
  end: function(){

  }
};

// Stores games info
var games = {};
var matchQueue = [];
var rooms = {};

// sockets
io.on('connection', function(socket) {
  socket.on('disconnect', function() {
    delete games[rooms[socket.id]];
    delete rooms[socket.id];
  });
  socket.on('matchmake', function(dimensions) {
    if (matchQueue.length > 0){
      var roomId = matchQueue[0].room;
      socket.join(roomId);
      rooms[socket.id] = roomId;

      // create game
      games[roomId] = new Game(matchQueue[0], {id: socket.id, w: dimensions.w, h: dimensions.h}, roomId);

      console.log(socket.id + " joined matchmaking from " + matchQueue[0].id);
      // remove waiting player from match queue
      matchQueue.shift();
      // tell the sockets that a room has been made and send room id
      games[roomId].madeRoom();
      games[roomId].emit();
      console.log(games[roomId]);
    }
    else{
      // generate unique room id
      var roomId = socket.id;
      socket.join(roomId);
      rooms[socket.id] = roomId;

      matchQueue.push({id: socket.id, w: dimensions.w, h: dimensions.h, room: roomId});
      console.log(socket.id + " requested matchmaking...");
    }
  });
  socket.on('clicked', function(mouse) {
    if (!mouse.clicked){return;}
    var room = rooms[socket.id];
    // game = games[room]

    games[room].update(socket.id, mouse);
    games[room].emit();
  });
});