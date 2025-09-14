const { Server } = require('socket.io');
const { createServer } = require('http');

// Store connected users (max 2)
let connectedUsers = new Set();

// Store drawing data, voice notes, shapes, and text elements
let drawingData = [];
let voiceNotes = [];
let shapes = [];
let textElements = [];

// Helper function to calculate distance from point to line segment
function distanceToLineSegment(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.sqrt(A * A + B * B);

  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const xx = lineStart.x + param * C;
  const yy = lineStart.y + param * D;

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

const SocketHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Setting up socket.io');
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

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
      socket.emit('load-shapes', shapes);
      socket.emit('load-text', textElements);

      // Send user count to all clients
      io.emit('user-count', connectedUsers.size);

      // Handle drawing events
      socket.on('drawing', (data) => {
        drawingData.push(data);
        socket.broadcast.emit('drawing', data);
      });

      // Test event to verify socket communication
      socket.on('test', (data) => {
        console.log('Backend received test event:', data);
      });

      // Handle shapes
      socket.on('shape', (data) => {
        console.log('Backend received shape event:', data);
        shapes.push(data);
        socket.broadcast.emit('shape', data);
      });

      // Handle text elements
      socket.on('text', (data) => {
        textElements.push(data);
        socket.broadcast.emit('text', data);
      });

      // Handle eraser events
      socket.on('erase-drawing', (eraseData) => {
        console.log('Backend received erase-drawing event:', eraseData);
        // Filter out erased drawing data on server
        const eraseRadius = eraseData.radius;
        drawingData = drawingData.filter(line => {
          const distance = distanceToLineSegment(
            eraseData,
            { x: line.x0, y: line.y0 },
            { x: line.x1, y: line.y1 }
          );
          return distance > eraseRadius;
        });
        socket.broadcast.emit('erase-drawing', eraseData);
      });

      socket.on('erase-shapes', (eraseData) => {
        shapes = shapes.filter(shape => {
          const shapeX = Math.min(shape.x, shape.x + shape.width);
          const shapeY = Math.min(shape.y, shape.y + shape.height);
          const shapeWidth = Math.abs(shape.width);
          const shapeHeight = Math.abs(shape.height);

          return !(eraseData.x >= shapeX - eraseData.radius &&
                   eraseData.x <= shapeX + shapeWidth + eraseData.radius &&
                   eraseData.y >= shapeY - eraseData.radius &&
                   eraseData.y <= shapeY + shapeHeight + eraseData.radius);
        });
        socket.broadcast.emit('erase-shapes', eraseData);
      });

      socket.on('erase-text', (eraseData) => {
        textElements = textElements.filter(text => {
          const distance = Math.sqrt(
            Math.pow(eraseData.x - text.x, 2) + Math.pow(eraseData.y - text.y, 2)
          );
          return distance > eraseData.radius;
        });
        socket.broadcast.emit('erase-text', eraseData);
      });

      // Handle clear canvas
      socket.on('clear-canvas', () => {
        drawingData = [];
        voiceNotes = [];
        shapes = [];
        textElements = [];
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
  }

  res.end();
};

export default SocketHandler;