const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store connected users (max 2)
let connectedUsers = new Set();

// Store drawing data and voice notes
let drawingData = [];
let voiceNotes = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Check if room is full (max 2 users)
  if (connectedUsers.size >= 2) {
    socket.emit('room-full');
    socket.disconnect();
    return;
  }
  
  connectedUsers.add(socket.id);
  
  // Send current drawing data to new user
  socket.emit('load-drawing', drawingData);
  socket.emit('load-voice-notes', voiceNotes);
  
  // Send user count to all clients
  io.emit('user-count', connectedUsers.size);
  
  // Handle drawing events
  socket.on('drawing', (data) => {
    drawingData.push(data);
    socket.broadcast.emit('drawing', data);
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    drawingData = [];
    voiceNotes = [];
    io.emit('clear-canvas');
  });
  
  // Handle voice notes
  socket.on('voice-note', (data) => {
    voiceNotes.push(data);
    socket.broadcast.emit('voice-note', data);
  });
  
  // Handle voice note movement
  socket.on('voice-note-moved', (data) => {
    // Update the voice note position in server storage
    const noteIndex = voiceNotes.findIndex(note => note.id === data.id);
    if (noteIndex !== -1) {
      voiceNotes[noteIndex].x = data.x;
      voiceNotes[noteIndex].y = data.y;
    }
    socket.broadcast.emit('voice-note-moved', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
    io.emit('user-count', connectedUsers.size);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});