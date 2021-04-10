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