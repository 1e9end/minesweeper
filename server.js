const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = 7777;

app.set('port', port);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});

// sockets
io.on('connection', function(socket) {
  
});

setInterval(function() {
  io.sockets.emit('message', 'hi!');
}, 1000);