import { useRef, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

// Import Google Fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
if (!document.head.querySelector(`link[href="${fontLink.href}"]`)) {
  document.head.appendChild(fontLink);
}

const Canvas = () => {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const lastPositionRef = useRef(null);
  const mousePositionRef = useRef({ x: 400, y: 300 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [roomFull, setRoomFull] = useState(false);
  const [playingNotes, setPlayingNotes] = useState(new Set());
  const [draggingNote, setDraggingNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVoiceNotesCollapsed, setIsVoiceNotesCollapsed] = useState(false);
  
  // Color and user management
  const [drawingColor, setDrawingColor] = useState('#8b5cf6');
  const [userColor, setUserColor] = useState('#8b5cf6');
  const [userId, setUserId] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  
  // Predefined color palette
  const colorPalette = [
    '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', 
    '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6',
    '#f43f5e', '#22c55e', '#eab308', '#3b82f6', '#a855f7'
  ];

  // Utility functions
  const generateUserId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getRandomColor = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  const getUserInitials = (userId) => {
    if (!userId) return 'U';
    return userId.substr(0, 2).toUpperCase();
  };

  const handleDrawingColorChange = (color) => {
    setDrawingColor(color);
    if (socketRef.current && userId) {
      socketRef.current.emit('drawing-color-change', {
        userId,
        color
      });
    }
  };

  const handleColorPickerToggle = () => {
    setIsColorPickerOpen(!isColorPickerOpen);
  };

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3001');

    const socket = socketRef.current;

    // Generate user ID and assign color
    const newUserId = generateUserId();
    const newUserColor = getRandomColor();
    setUserId(newUserId);
    setUserColor(newUserColor);
    setDrawingColor(newUserColor); // Start with user color

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
      // Join with user information
      socket.emit('user-join', { 
        userId: newUserId, 
        userColor: newUserColor 
      });
    });

    socket.on('room-full', () => {
      setRoomFull(true);
    });

    socket.on('user-count', (count) => {
      setUserCount(count);
    });

    socket.on('drawing', (data) => {
      drawLine(data);
    });

    socket.on('load-drawing', (drawingData) => {
      drawingData.forEach(data => drawLine(data));
    });

    socket.on('load-voice-notes', (notes) => {
      setVoiceNotes(notes);
    });

    socket.on('voice-note', (note) => {
      setVoiceNotes(prev => [...prev, note]);
    });

    socket.on('voice-note-moved', (noteData) => {
      setVoiceNotes(prev => prev.map(note =>
        note.id === noteData.id ? { ...note, x: noteData.x, y: noteData.y } : note
      ));
    });

    socket.on('clear-canvas', () => {
      clearCanvas();
      setVoiceNotes([]);
    });

    // New socket events for user management and colors
    socket.on('users-update', (users) => {
      setConnectedUsers(users);
    });

    socket.on('user-cursor', (cursorData) => {
      setUserCursors(prev => ({
        ...prev,
        [cursorData.userId]: cursorData
      }));
    });

    socket.on('drawing-color-changed', (colorData) => {
      // Handle when other users change their drawing color
      console.log(`User ${colorData.userId} changed drawing color to ${colorData.color}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Convert blob to base64 for sharing across users
  const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const drawLine = useCallback((data) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = data.color || '#8b5cf6';
    ctx.lineWidth = data.lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(data.x0, data.y0);
    ctx.lineTo(data.x1, data.y1);
    ctx.stroke();
  }, []);

  const startDrawing = useCallback((e) => {
    if (draggingNote) return; // Don't draw while dragging
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPositionRef.current = { x, y };
    setIsDrawing(true);
  }, [draggingNote]);

  const draw = useCallback((e) => {
    if (!isDrawing || draggingNote) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastPositionRef.current) {
      const drawData = {
        x0: lastPositionRef.current.x,
        y0: lastPositionRef.current.y,
        x1: x,
        y1: y,
        color: drawingColor,
        lineWidth: 3,
        userId: userId
      };
      drawLine(drawData);
      socketRef.current.emit('drawing', drawData);
    }

    lastPositionRef.current = { x, y };
  }, [isDrawing, drawLine, draggingNote, drawingColor, userId]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPositionRef.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    socketRef.current.emit('clear-canvas');
  };



  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check supported formats and use the most compatible one
      let options = { mimeType: 'audio/webm' };

      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        const audioData = await blobToBase64(blob);

        const voiceNote = {
          id: Date.now(),
          audioData,
          mimeType: options.mimeType, // Store the MIME type
          x: mousePositionRef.current.x,
          y: mousePositionRef.current.y,
          timestamp: new Date().toISOString(),
          userId: userId,
          userColor: userColor,
          userInitials: getUserInitials(userId)
        };

        setVoiceNotes(prev => [...prev, voiceNote]);
        socketRef.current.emit('voice-note', voiceNote);

        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
    }
  };

  // Alternative: Use Blob URL instead of base64 (more reliable)
  const playVoiceNote = async (note) => {
    try {
      setPlayingNotes(prev => new Set([...prev, note.id]));

      // Convert base64 back to blob for better compatibility
      const response = await fetch(note.audioData);
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
        setPlayingNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(note.id);
          return newSet;
        });
      };

      audio.onerror = (e) => {
        console.error('Audio error:', e);
        URL.revokeObjectURL(audioUrl);
        setPlayingNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(note.id);
          return newSet;
        });
      };

      await audio.play();

    } catch (err) {
      console.error('Error playing voice note:', err);
      setPlayingNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(note.id);
        return newSet;
      });
    }
  };

  // Voice note drag handlers
  const handleVoiceNoteMouseDown = (e, note) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDraggingNote(note.id);
    setDragOffset({
      x: x - note.x,
      y: y - note.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mousePositionRef.current = { x, y };

      // Emit cursor position for other users
      if (userId && socketRef.current) {
        socketRef.current.emit('cursor-move', {
          userId,
          x,
          y,
          userColor
        });
      }

      if (draggingNote) {
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;

        setVoiceNotes(prev => prev.map(note =>
          note.id === draggingNote
            ? { ...note, x: newX, y: newY }
            : note
        ));
      }
    }
  }, [draggingNote, dragOffset, userId, userColor]);

  const handleMouseUp = useCallback(() => {
    if (draggingNote) {
      const draggedNote = voiceNotes.find(note => note.id === draggingNote);
      if (draggedNote) {
        socketRef.current.emit('voice-note-moved', {
          id: draggedNote.id,
          x: draggedNote.x,
          y: draggedNote.y
        });
      }
      setDraggingNote(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [draggingNote, voiceNotes]);

  // Waveform animation component
  const WaveformAnimation = ({ isPlaying }) => {
    if (!isPlaying) return null;

    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1px'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: '2px',
              backgroundColor: '#fff',
              borderRadius: '1px',
              animation: `waveform 0.6s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              height: '8px'
            }}
          />
        ))}
      </div>
    );
  };

  if (roomFull) {
    return (
      <div className="container fade-in" style={{ textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 className="main-title">Room is Full</h2>
        <p className="description-text">Maximum 2 users allowed. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      <style>
        {`
          /* CSS Reset and Base Styles */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: #f8fafc;
            line-height: 1.6;
            min-height: 100vh;
          }
          
          /* Fade-in animation */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .fade-in {
            animation: fadeIn 0.8s ease-out;
          }
          
          @keyframes waveform {
            0%, 100% { height: 4px; }
            50% { height: 12px; }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          
          /* Modern Button Styles */
          .modern-button {
            border: none;
            border-radius: 16px;
            padding: 14px 28px;
            font-family: inherit;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(20px);
            position: relative;
            overflow: hidden;
          }
          
          .modern-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
          }
          
          .modern-button:hover::before {
            left: 100%;
          }
          
          .button-primary {
            background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
            color: white;
            border: 1px solid rgba(139, 92, 246, 0.3);
          }
          
          .button-primary:hover {
            background: linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #a855f7 100%);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
          }
          
          .button-secondary {
            background: linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%);
            color: white;
            border: 1px solid rgba(100, 116, 139, 0.3);
          }
          
          .button-secondary:hover {
            background: linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 25px rgba(100, 116, 139, 0.4);
          }
          
          .button-danger {
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%);
            color: white;
            border: 1px solid rgba(244, 63, 94, 0.3);
          }
          
          .button-danger:hover {
            background: linear-gradient(135deg, #e11d48 0%, #be123c 50%, #9f1239 100%);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 25px rgba(244, 63, 94, 0.4);
          }
          
          .button-success {
            background: linear-gradient(135deg, #06d6a0 0%, #10b981 50%, #059669 100%);
            color: white;
            border: 1px solid rgba(6, 214, 160, 0.3);
          }
          
          .button-success:hover {
            background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 25px rgba(6, 214, 160, 0.4);
          }
          
          /* Canvas Container */
          .canvas-container {
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            border: 2px solid #444;
            background: white;
          }
          
          /* Voice Note Styles */
          .voice-note {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0.8;
            backdrop-filter: blur(8px);
          }
          
          .voice-note:hover {
            transform: scale(1.2);
            opacity: 1;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          }
          
          .voice-note.playing {
            animation: pulse 1s ease-in-out infinite;
            opacity: 1;
          }
          
          .voice-note.dragging {
            transform: scale(1.1);
            opacity: 0.9;
            z-index: 1000;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
          }
          
          /* Voice Notes Panel */
          .voice-notes-panel {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95));
            border-radius: 20px;
            padding: 24px;
            margin-top: 32px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(139, 92, 246, 0.2);
            backdrop-filter: blur(20px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .voice-notes-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
          }
          
          .panel-collapsed {
            padding: 16px 24px;
          }
          
          .toggle-button {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #c4b5fd;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 10px 12px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          
          .toggle-button:hover {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2));
            color: #ddd6fe;
            transform: scale(1.05);
          }
          
          /* Typography */
          .main-title {
            font-size: 2.75rem;
            font-weight: 800;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 25%, #ef4444 50%, #ec4899 75%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            letter-spacing: -0.025em;
          }
          
          .section-title {
            font-size: 1.375rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
            letter-spacing: -0.0125em;
          }
          
          .user-count {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15));
            color: #c4b5fd;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(139, 92, 246, 0.3);
            backdrop-filter: blur(10px);
          }
          
          .description-text {
            color: #cbd5e1;
            font-size: 15px;
            line-height: 1.6;
            font-weight: 400;
          }
          
          /* Color Picker Styles */
          .color-picker-toolbar {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95));
            border-radius: 16px;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(139, 92, 246, 0.2);
            margin-bottom: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }
          
          .color-picker-button {
            padding: 8px 12px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
            color: #c4b5fd;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid rgba(139, 92, 246, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .color-picker-button:hover {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2));
            transform: translateY(-1px);
          }
          
          .current-color-indicator {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }
          
          .color-palette {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            padding: 16px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(51, 65, 85, 0.98));
            border-radius: 16px;
            border: 1px solid rgba(139, 92, 246, 0.3);
            backdrop-filter: blur(30px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 1000;
            margin-top: 8px;
          }
          
          .color-option {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }
          
          .color-option:hover {
            transform: scale(1.1);
            border-color: rgba(255, 255, 255, 0.8);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          
          .color-option.selected {
            border-color: #fff;
            border-width: 3px;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
          }
          
          .custom-color-input {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          
          .user-cursors {
            position: absolute;
            pointer-events: none;
            z-index: 500;
          }
          
          .user-cursor {
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            transform: translate(-50%, -50%);
            transition: all 0.1s ease;
          }
          
          .user-cursor::after {
            content: attr(data-user);
            position: absolute;
            top: -28px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            white-space: nowrap;
          }
          
          .users-list {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          
          .user-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 12px;
            font-weight: 500;
          }
          
          .user-color-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.5);
          }
          
          /* Responsive Design */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px 24px;
          }
          
          .header {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 24px;
            align-items: center;
            margin-bottom: 32px;
          }
          
          .controls {
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
          }
          
          @media (max-width: 768px) {
            .header {
              grid-template-columns: 1fr;
              gap: 16px;
              text-align: center;
            }
            
            .controls {
              justify-content: center;
            }
            
            .main-title {
              font-size: 2rem;
            }
            
            .canvas-container canvas {
              max-width: 100%;
              height: auto;
            }
          }
          
          @media (max-width: 480px) {
            .container {
              padding: 24px 16px;
            }
            
            .controls {
              flex-direction: column;
              width: 100%;
            }
            
            .modern-button {
              width: 100%;
              justify-content: center;
            }
          }
        `}
      </style>

      <div className="header">
        <div>
          <h1 className="main-title">Collaborative Whiteboard</h1>
          <span className="user-count">Users online: {userCount}/2</span>
        </div>
        <div className="controls">
          <button 
            onClick={handleClearCanvas} 
            className="modern-button button-secondary"
          >
            Clear Canvas
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`modern-button ${isRecording ? 'button-danger' : 'button-primary'}`}
          >
            {isRecording ? '⏹ Stop Recording' : '🎙 Record Voice Note'}
          </button>
        </div>
        <div className="users-list">
          {connectedUsers.map(user => (
            <div key={user.userId} className="user-badge" style={{ background: `${user.userColor}20` }}>
              <div 
                className="user-color-dot" 
                style={{ backgroundColor: user.userColor }}
              ></div>
              <span>{getUserInitials(user.userId)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color Picker Toolbar */}
      <div className="color-picker-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}>Drawing Color:</span>
          <div 
            className="current-color-indicator" 
            style={{ backgroundColor: drawingColor }}
          ></div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            className="color-picker-button"
            onClick={handleColorPickerToggle}
          >
            🎨 Change Color
          </button>
          
          {isColorPickerOpen && (
            <div className="color-palette">
              {colorPalette.map(color => (
                <div
                  key={color}
                  className={`color-option ${drawingColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    handleDrawingColorChange(color);
                    setIsColorPickerOpen(false);
                  }}
                ></div>
              ))}
              <input
                type="color"
                className="custom-color-input"
                value={drawingColor}
                onChange={(e) => {
                  handleDrawingColorChange(e.target.value);
                  setIsColorPickerOpen(false);
                }}
              />
            </div>
          )}
        </div>
        
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Your Color: 
          <div 
            style={{ 
              display: 'inline-block',
              width: '16px', 
              height: '16px', 
              backgroundColor: userColor,
              borderRadius: '50%',
              marginLeft: '6px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          ></div>
        </div>
      </div>

      <div
        className="canvas-container"
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            cursor: draggingNote ? 'grabbing' : 'crosshair',
            backgroundColor: 'white',
            display: 'block'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {/* User cursor indicators */}
        <div className="user-cursors">
          {Object.entries(userCursors).map(([cursorUserId, cursor]) => {
            if (cursorUserId === userId) return null; // Don't show own cursor
            return (
              <div
                key={cursorUserId}
                className="user-cursor"
                style={{
                  left: cursor.x,
                  top: cursor.y,
                  backgroundColor: cursor.userColor
                }}
                data-user={getUserInitials(cursorUserId)}
              />
            );
          })}
        </div>

        {/* Voice note indicators */}
        {voiceNotes.map(note => {
          const isPlaying = playingNotes.has(note.id);
          const isDragging = draggingNote === note.id;

          return (
            <div
              key={note.id}
              className={`voice-note ${isPlaying ? 'playing' : ''} ${isDragging ? 'dragging' : ''}`}
              onMouseDown={(e) => handleVoiceNoteMouseDown(e, note)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) {
                  playVoiceNote(note);
                }
              }}
              style={{
                position: 'absolute',
                left: note.x - 25,
                top: note.y - 25,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: isPlaying
                  ? `linear-gradient(135deg, ${note.userColor}80, ${note.userColor}ff, ${note.userColor}cc)`
                  : `linear-gradient(135deg, ${note.userColor}cc, ${note.userColor}ff, ${note.userColor}80)`,
                border: '3px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                cursor: isDragging ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#fff',
                userSelect: 'none',
                zIndex: isDragging ? 1000 : 10
              }}
              title="Click to play, drag to move"
            >
              {isPlaying ? (
                <WaveformAnimation isPlaying={true} />
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {note.userInitials || getUserInitials(note.userId)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className={`voice-notes-panel ${isVoiceNotesCollapsed ? 'panel-collapsed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isVoiceNotesCollapsed ? 0 : '16px' }}>
          <h3 className="section-title">Voice Notes ({voiceNotes.length})</h3>
          <button 
            className="toggle-button"
            onClick={() => setIsVoiceNotesCollapsed(!isVoiceNotesCollapsed)}
            title={isVoiceNotesCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isVoiceNotesCollapsed ? '▼' : '▲'}
          </button>
        </div>
        {!isVoiceNotesCollapsed && (
          <div>
            <p className="description-text">Click circles to play audio, drag to move them around the canvas.</p>
            {voiceNotes.length > 0 && (
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {voiceNotes.map((note, index) => (
                  <div
                    key={note.id}
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: playingNotes.has(note.id)
                          ? `linear-gradient(135deg, ${note.userColor}80, ${note.userColor}ff)`
                          : `linear-gradient(135deg, ${note.userColor}cc, ${note.userColor}ff)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: 'white',
                        flexShrink: 0
                      }}
                      onClick={() => playVoiceNote(note)}
                    >
                      {playingNotes.has(note.id) ? '⏸' : '▶'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>
                        Voice Note #{index + 1} - {note.userInitials || getUserInitials(note.userId)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(note.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;