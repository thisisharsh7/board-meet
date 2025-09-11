import { useRef, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { 
  Hand, 
  Square, 
  Diamond, 
  Circle, 
  ArrowRight, 
  Minus, 
  PenTool, 
  Type, 
  Eraser, 
  Mic, 
  Trash2 
} from 'lucide-react';

const Canvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const lastPositionRef = useRef(null);
  const mousePositionRef = useRef({ x: 100, y: 100 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [roomFull, setRoomFull] = useState(false);
  const [playingNotes, setPlayingNotes] = useState(new Set());
  const [draggingNote, setDraggingNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTool, setCurrentTool] = useState('pen');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [scale, setScale] = useState(1); // 1 = 100%, 2 = 200%, 0.5 = 50%
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Store all drawing data for redrawing
  const [drawingData, setDrawingData] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [textElements, setTextElements] = useState([]);
  
  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPos, setShapeStartPos] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  
  // Text editing state
  const [editingText, setEditingText] = useState(null);
  const [textInput, setTextInput] = useState('');
  
  // Eraser state
  const [eraserSize, setEraserSize] = useState(16);
  const eraserCursorRef = useRef(null);
  const [eraserTrail, setEraserTrail] = useState([]);
  const drawingBoardRef = useRef(null);
  
  // Color and user management
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [userId, setUserId] = useState(null);
  const [userColor, setUserColor] = useState('#3b82f6');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  
  // Predefined color palette
  const strokeColors = ['#000000', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
  const backgroundColors = ['#ffffff', '#fecaca', '#bbf7d0', '#dbeafe', '#fef3c7', '#f3f4f6', '#e0e7ff', '#fce7f3', '#cffafe', '#ecfccb'];

  // Helper function to calculate distance from point to line segment
  const distanceToLineSegment = (point, lineStart, lineEnd) => {
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
  };

  // Utility functions
  const generateUserId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getUserInitials = (userId) => {
    if (!userId) return 'U';
    return userId.substr(0, 2).toUpperCase();
  };

  // Canvas utilities - Convert mouse coordinates to logical canvas coordinates
  // This is the EXACT formula you specified: canvasX = (mouseX - panX) / scale
  const getLogicalCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert raw mouse coordinates to logical canvas coordinates
    const canvasX = (mouseX - panX) / scale;
    const canvasY = (mouseY - panY) / scale;
    
    return { x: canvasX, y: canvasY };
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // redrawCanvas will be called by useEffect
    }
  };

  useEffect(() => {
    // Initialize canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize socket connection
    socketRef.current = io('http://localhost:3001');
    const socket = socketRef.current;
    const newUserId = generateUserId();
    setUserId(newUserId);

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('user-join', { userId: newUserId });
    });

    socket.on('room-full', () => {
      setRoomFull(true);
    });

    socket.on('user-count', (count) => {
      setUserCount(count);
    });

    socket.on('drawing', (data) => {
      setDrawingData(prev => [...prev, data]);
      drawLine(data);
    });

    socket.on('load-drawing', (drawingDataFromServer) => {
      setDrawingData(drawingDataFromServer);
      // redrawCanvas will be called by useEffect when drawingData changes
    });

    socket.on('load-voice-notes', (notes) => {
      setVoiceNotes(notes);
    });

    socket.on('load-shapes', (loadedShapes) => {
      setShapes(loadedShapes);
    });

    socket.on('load-text', (loadedText) => {
      setTextElements(loadedText);
    });

    socket.on('voice-note', (note) => {
      setVoiceNotes(prev => [...prev, note]);
    });

    socket.on('voice-note-moved', (noteData) => {
      setVoiceNotes(prev => prev.map(note =>
        note.id === noteData.id ? { ...note, x: noteData.x, y: noteData.y } : note
      ));
    });

    socket.on('shape', (shapeData) => {
      console.log('Received shape event:', shapeData);
      setShapes(prev => [...prev, shapeData]);
    });

    socket.on('text', (textData) => {
      setTextElements(prev => [...prev, textData]);
    });

    socket.on('erase-drawing', (eraseData) => {
      console.log('Received erase-drawing event:', eraseData);
      setDrawingData(prev => prev.filter(line => {
        // Helper function for line segment distance calculation
        const distanceToLine = (point, lineStart, lineEnd) => {
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
        };
        
        const distance = distanceToLine(
          eraseData,
          { x: line.x0, y: line.y0 },
          { x: line.x1, y: line.y1 }
        );
        return distance > eraseData.radius;
      }));
    });

    socket.on('erase-shapes', (eraseData) => {
      console.log('Received erase-shapes event:', eraseData);
      setShapes(prev => prev.filter(shape => {
        const shapeX = Math.min(shape.x, shape.x + shape.width);
        const shapeY = Math.min(shape.y, shape.y + shape.height);
        const shapeWidth = Math.abs(shape.width);
        const shapeHeight = Math.abs(shape.height);
        
        return !(eraseData.x >= shapeX - eraseData.radius && 
                 eraseData.x <= shapeX + shapeWidth + eraseData.radius &&
                 eraseData.y >= shapeY - eraseData.radius && 
                 eraseData.y <= shapeY + shapeHeight + eraseData.radius);
      }));
    });

    socket.on('erase-text', (eraseData) => {
      console.log('Received erase-text event:', eraseData);
      setTextElements(prev => prev.filter(text => {
        const distance = Math.sqrt(
          Math.pow(eraseData.x - text.x, 2) + Math.pow(eraseData.y - text.y, 2)
        );
        return distance > eraseData.radius;
      }));
    });

    socket.on('clear-canvas', () => {
      clearCanvas();
      setVoiceNotes([]);
      setShapes([]);
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
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

  // Draw a single line using logical coordinates
  const drawLine = useCallback((data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // First apply the transformation: context.setTransform(scale, 0, 0, scale, panX, panY)
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    
    // Then draw normally using logical coordinates (data is already in logical coords)
    ctx.globalAlpha = (data.opacity || opacity) / 100;
    ctx.strokeStyle = data.color || drawingColor;
    ctx.lineWidth = data.lineWidth || strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(data.x0, data.y0);  // These are logical coordinates
    ctx.lineTo(data.x1, data.y1);  // These are logical coordinates  
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [drawingColor, strokeWidth, opacity, scale, panX, panY]);

  // Draw a shape using logical coordinates
  const drawShape = useCallback((shapeData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    
    ctx.globalAlpha = (shapeData.opacity || opacity) / 100;
    ctx.strokeStyle = shapeData.color || drawingColor;
    ctx.lineWidth = shapeData.lineWidth || strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = shapeData.fillColor || 'transparent';

    ctx.beginPath();
    
    switch (shapeData.type) {
      case 'rectangle':
        ctx.rect(shapeData.x, shapeData.y, shapeData.width, shapeData.height);
        break;
      case 'circle':
        const radius = Math.sqrt(shapeData.width * shapeData.width + shapeData.height * shapeData.height) / 2;
        const centerX = shapeData.x + shapeData.width / 2;
        const centerY = shapeData.y + shapeData.height / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;
      case 'diamond':
        const midX = shapeData.x + shapeData.width / 2;
        const midY = shapeData.y + shapeData.height / 2;
        ctx.moveTo(midX, shapeData.y);
        ctx.lineTo(shapeData.x + shapeData.width, midY);
        ctx.lineTo(midX, shapeData.y + shapeData.height);
        ctx.lineTo(shapeData.x, midY);
        ctx.closePath();
        break;
      case 'line':
        ctx.moveTo(shapeData.x, shapeData.y);
        ctx.lineTo(shapeData.x + shapeData.width, shapeData.y + shapeData.height);
        break;
      case 'arrow':
        // Draw arrow line
        const endX = shapeData.x + shapeData.width;
        const endY = shapeData.y + shapeData.height;
        ctx.moveTo(shapeData.x, shapeData.y);
        ctx.lineTo(endX, endY);
        
        // Draw arrowhead
        const headLength = 10;
        const angle = Math.atan2(shapeData.height, shapeData.width);
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        break;
    }
    
    if (shapeData.fillColor && shapeData.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [drawingColor, strokeWidth, opacity, scale, panX, panY]);

  // Redraw all stored drawing data
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    
    // Step 1: Reset transform and clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Step 2: Set background (no transform needed for background)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Step 3: Apply transformation as you specified: context.setTransform(scale, 0, 0, scale, panX, panY)
    ctx.setTransform(scale, 0, 0, scale, panX, panY);
    
    // Step 4: Draw grid dots using logical coordinates
    ctx.fillStyle = '#e5e7eb';
    
    // Calculate visible area in logical coordinates
    const visibleStartX = Math.floor((-panX / scale - gridSize) / gridSize) * gridSize;
    const visibleEndX = Math.ceil((canvas.width - panX) / scale / gridSize) * gridSize;
    const visibleStartY = Math.floor((-panY / scale - gridSize) / gridSize) * gridSize;
    const visibleEndY = Math.ceil((canvas.height - panY) / scale / gridSize) * gridSize;
    
    for (let x = visibleStartX; x <= visibleEndX; x += gridSize) {
      for (let y = visibleStartY; y <= visibleEndY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1 / scale, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Step 5: Draw all stored paths normally using their logical coordinates
    // The transform is already applied, so we just draw with the stored logical coordinates
    drawingData.forEach(data => {
      ctx.globalAlpha = (data.opacity || opacity) / 100;
      ctx.strokeStyle = data.color || drawingColor;
      ctx.lineWidth = data.lineWidth || strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);  // Stored logical coordinates
      ctx.lineTo(data.x1, data.y1);  // Stored logical coordinates
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    
    // Step 6: Draw all shapes
    shapes.forEach(shape => {
      drawShape(shape);
    });
    
    // Step 7: Draw current shape being drawn
    if (currentShape) {
      drawShape(currentShape);
    }
    
    // Step 8: Draw text elements
    textElements.forEach(textEl => {
      ctx.globalAlpha = (textEl.opacity || opacity) / 100;
      ctx.fillStyle = textEl.color || drawingColor;
      ctx.font = `${textEl.fontSize || 16}px Arial`;
      ctx.fillText(textEl.text, textEl.x, textEl.y);
      ctx.globalAlpha = 1;
    });
  }, [scale, panX, panY, backgroundColor, drawingData, shapes, currentShape, textElements, opacity, drawingColor, strokeWidth, drawShape]);

  // Redraw everything when scale, pan, or background changes
  useEffect(() => {
    if (canvasRef.current) {
      redrawCanvas();
    }
  }, [scale, panX, panY, backgroundColor, redrawCanvas]);

  // Clean up eraser trail periodically
  useEffect(() => {
    if (eraserTrail.length === 0) return;
    
    const cleanupInterval = setInterval(() => {
      setEraserTrail(prev => {
        const cutoffTime = Date.now() - 300;
        const filtered = prev.filter(point => point.timestamp > cutoffTime);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 50);

    return () => clearInterval(cleanupInterval);
  }, [eraserTrail.length]);

  // Handle cursor visibility when tool changes
  useEffect(() => {
    if (eraserCursorRef.current) {
      if (currentTool === 'eraser') {
        // Initialize cursor as hidden, will show when mouse enters drawing board
        eraserCursorRef.current.style.visibility = 'hidden';
      } else {
        eraserCursorRef.current.style.visibility = 'hidden';
      }
    }
  }, [currentTool]);

  const startDrawing = useCallback((e) => {
    if (draggingNote) return;
    
    if (currentTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }
    
    const logicalCoords = getLogicalCoordinates(e);
    
    if (currentTool === 'pen') {
      lastPositionRef.current = logicalCoords;
      setIsDrawing(true);
      return;
    }
    
    if (currentTool === 'eraser') {
      setIsDrawing(true);
      eraseAtPosition(logicalCoords);
      return;
    }
    
    // Handle text tool
    if (currentTool === 'text') {
      setEditingText({
        x: logicalCoords.x,
        y: logicalCoords.y,
        color: drawingColor,
        fontSize: 16,
        opacity: opacity,
        userId: userId
      });
      setTextInput('');
      return;
    }
    
    // Handle shape tools
    if (['rectangle', 'circle', 'diamond', 'line', 'arrow'].includes(currentTool)) {
      console.log('Starting shape drawing:', currentTool, 'at position:', logicalCoords);
      setIsDrawingShape(true);
      setShapeStartPos(logicalCoords);
      setCurrentShape({
        type: currentTool,
        x: logicalCoords.x,
        y: logicalCoords.y,
        width: 0,
        height: 0,
        color: drawingColor,
        lineWidth: strokeWidth,
        opacity: opacity,
        userId: userId
      });
    }
  }, [draggingNote, currentTool, panX, panY, scale, drawingColor, strokeWidth, opacity, userId]);

  const draw = useCallback((e) => {
    if (draggingNote) return;
    
    const logicalCoords = getLogicalCoordinates(e);
    
    // Handle pen drawing
    if (isDrawing && currentTool === 'pen') {
      if (lastPositionRef.current) {
        // Store drawing data in LOGICAL coordinates (no scaling/panning applied)
        const drawData = {
          x0: lastPositionRef.current.x,
          y0: lastPositionRef.current.y,
          x1: logicalCoords.x,
          y1: logicalCoords.y,
          color: drawingColor,
          lineWidth: strokeWidth,
          opacity: opacity,
          userId: userId
        };
        
        // Store drawing data locally for redrawing
        setDrawingData(prev => [...prev, drawData]);
        
        // Draw the line immediately (this will apply transform automatically)
        drawLine(drawData);
        
        // Send to other users (they will receive logical coordinates)
        socketRef.current.emit('drawing', drawData);
      }
      
      // Update last position with logical coordinates
      lastPositionRef.current = logicalCoords;
      return;
    }
    
    // Handle eraser movement
    if (isDrawing && currentTool === 'eraser') {
      eraseAtPosition(logicalCoords);
      return;
    }
    
    // Handle shape drawing
    if (isDrawingShape && shapeStartPos && currentShape) {
      const width = logicalCoords.x - shapeStartPos.x;
      const height = logicalCoords.y - shapeStartPos.y;
      
      setCurrentShape(prev => ({
        ...prev,
        width: width,
        height: height
      }));
      
      // Redraw canvas to show current shape
      redrawCanvas();
    }
  }, [isDrawing, isDrawingShape, drawLine, draggingNote, drawingColor, strokeWidth, opacity, userId, currentTool, scale, panX, panY, shapeStartPos, currentShape, redrawCanvas]);

  const stopDrawing = useCallback(() => {
    // Handle pen drawing stop
    setIsDrawing(false);
    lastPositionRef.current = null;
    
    // Handle shape drawing completion
    if (isDrawingShape && currentShape) {
      console.log('Completing shape:', currentShape);
      // Only add shape if it has meaningful size
      if (Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5) {
        const finalShape = { ...currentShape, id: Date.now() };
        console.log('Shape has meaningful size, adding to canvas:', finalShape);
        setShapes(prev => [...prev, finalShape]);
        
        // Test socket connection first
        socketRef.current.emit('test', { message: 'testing socket connection' });
        
        // Send shape to other users
        console.log('Emitting shape event:', finalShape);
        socketRef.current.emit('shape', finalShape);
      } else {
        console.log('Shape too small, not adding:', currentShape.width, currentShape.height);
      }
      
      setIsDrawingShape(false);
      setShapeStartPos(null);
      setCurrentShape(null);
    }
  }, [isDrawingShape, currentShape]);

  const handleTextSubmit = useCallback(() => {
    if (editingText && textInput.trim()) {
      const textElement = {
        ...editingText,
        text: textInput.trim(),
        id: Date.now()
      };
      
      setTextElements(prev => [...prev, textElement]);
      socketRef.current.emit('text', textElement);
    }
    
    setEditingText(null);
    setTextInput('');
  }, [editingText, textInput]);

  // Custom cursor management functions
  const showCustomCursor = useCallback(() => {
    if (eraserCursorRef.current && currentTool === 'eraser') {
      eraserCursorRef.current.style.visibility = 'visible';
    }
  }, [currentTool]);

  const hideCustomCursor = useCallback(() => {
    if (eraserCursorRef.current) {
      eraserCursorRef.current.style.visibility = 'hidden';
    }
  }, []);

  const updateCursorPosition = useCallback((e) => {
    if (eraserCursorRef.current && currentTool === 'eraser') {
      eraserCursorRef.current.style.left = e.clientX + 'px';
      eraserCursorRef.current.style.top = e.clientY + 'px';
    }
  }, [currentTool]);

  // Drawing board event handlers
  const handleDrawingBoardMouseMove = useCallback((e) => {
    updateCursorPosition(e);
  }, [updateCursorPosition]);

  const handleDrawingBoardMouseEnter = useCallback(() => {
    showCustomCursor();
  }, [showCustomCursor]);

  const handleDrawingBoardMouseLeave = useCallback(() => {
    hideCustomCursor();
  }, [hideCustomCursor]);

  // UI element event handlers
  const handleUIElementMouseOver = useCallback(() => {
    hideCustomCursor();
  }, [hideCustomCursor]);

  const handleUIElementMouseLeave = useCallback((e) => {
    // Check if mouse is still over drawing board
    if (drawingBoardRef.current) {
      const rect = drawingBoardRef.current.getBoundingClientRect();
      const isOverDrawingBoard = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      
      if (isOverDrawingBoard) {
        showCustomCursor();
        updateCursorPosition(e);
      }
    }
  }, [showCustomCursor, updateCursorPosition]);

  const eraseAtPosition = useCallback((coords) => {
    console.log('Erasing at position:', coords, 'current tool:', currentTool);
    const eraseRadius = eraserSize / 2;
    
    // Add to eraser trail for animation
    const trailPoint = {
      x: coords.x * scale + panX,
      y: coords.y * scale + panY,
      timestamp: Date.now(),
      id: Math.random()
    };
    
    setEraserTrail(prev => {
      const newTrail = [...prev, trailPoint];
      // Keep only recent trail points (last 300ms)
      const cutoffTime = Date.now() - 300;
      return newTrail.filter(point => point.timestamp > cutoffTime);
    });
    
    // Erase drawing data (lines)
    const newDrawingData = drawingData.filter(line => {
      // Check if line intersects with eraser circle
      const distance = distanceToLineSegment(
        coords, 
        { x: line.x0, y: line.y0 }, 
        { x: line.x1, y: line.y1 }
      );
      return distance > eraseRadius;
    });
    
    if (newDrawingData.length !== drawingData.length) {
      setDrawingData(newDrawingData);
      console.log('Emitting erase-drawing event:', { x: coords.x, y: coords.y, radius: eraseRadius });
      socketRef.current.emit('erase-drawing', { x: coords.x, y: coords.y, radius: eraseRadius });
    }
    
    // Erase shapes
    const newShapes = shapes.filter(shape => {
      // Check if point is inside shape bounds
      const shapeX = Math.min(shape.x, shape.x + shape.width);
      const shapeY = Math.min(shape.y, shape.y + shape.height);
      const shapeWidth = Math.abs(shape.width);
      const shapeHeight = Math.abs(shape.height);
      
      return !(coords.x >= shapeX - eraseRadius && 
               coords.x <= shapeX + shapeWidth + eraseRadius &&
               coords.y >= shapeY - eraseRadius && 
               coords.y <= shapeY + shapeHeight + eraseRadius);
    });
    
    if (newShapes.length !== shapes.length) {
      setShapes(newShapes);
      console.log('Emitting erase-shapes event:', { x: coords.x, y: coords.y, radius: eraseRadius });
      socketRef.current.emit('erase-shapes', { x: coords.x, y: coords.y, radius: eraseRadius });
    }
    
    // Erase text elements
    const newTextElements = textElements.filter(text => {
      const distance = Math.sqrt(
        Math.pow(coords.x - text.x, 2) + Math.pow(coords.y - text.y, 2)
      );
      return distance > eraseRadius;
    });
    
    if (newTextElements.length !== textElements.length) {
      setTextElements(newTextElements);
      console.log('Emitting erase-text event:', { x: coords.x, y: coords.y, radius: eraseRadius });
      socketRef.current.emit('erase-text', { x: coords.x, y: coords.y, radius: eraseRadius });
    }
  }, [eraserSize, drawingData, shapes, textElements, scale, panX, panY, currentTool]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.25, Math.min(3, scale + delta));
    setScale(newScale);
  }, [scale]);

  const clearCanvas = () => {
    setDrawingData([]);
    setShapes([]);
    setTextElements([]);
    // redrawCanvas will be called automatically by useEffect when drawingData changes
  };

  const handleClearCanvas = () => {
    setDrawingData([]);
    setShapes([]);
    setTextElements([]);
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

        console.log('Creating voice note at position:', voiceNote.x, voiceNote.y);

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

    // Convert to logical coordinates
    const logicalCoords = getLogicalCoordinates(e);

    setDraggingNote(note.id);
    setDragOffset({
      x: logicalCoords.x - note.x,
      y: logicalCoords.y - note.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;

    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPanX(newPanX);
      setPanY(newPanY);
      // Grid will be redrawn automatically by useEffect
      return;
    }

    // Convert to logical coordinates for voice notes
    const logicalCoords = getLogicalCoordinates(e);
    mousePositionRef.current = logicalCoords;

    if (draggingNote) {
      const newX = logicalCoords.x - dragOffset.x;
      const newY = logicalCoords.y - dragOffset.y;

      setVoiceNotes(prev => prev.map(note =>
        note.id === draggingNote
          ? { ...note, x: newX, y: newY }
          : note
      ));
    }
  }, [draggingNote, dragOffset, isPanning, panStart, scale, panX, panY]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
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
  }, [draggingNote, voiceNotes, isPanning]);

  // UI Components
  const ToolbarButton = ({ icon, active, onClick, title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onMouseOver={handleUIElementMouseOver}
      onMouseLeave={handleUIElementMouseLeave}
    >
      {typeof icon === 'string' ? icon : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
    </button>
  );

  const ColorButton = ({ color, active, onClick }) => (
    <button
      onClick={() => onClick(color)}
      className={`color-btn ${active ? 'active' : ''}`}
      style={{ backgroundColor: color }}
    />
  );

  const StrokeWidthButton = ({ width, active, onClick }) => (
    <button
      onClick={() => onClick(width)}
      className={`stroke-btn ${active ? 'active' : ''}`}
    >
      <div 
        style={{
          width: '20px',
          height: `${width}px`,
          backgroundColor: '#374151',
          borderRadius: '10px'
        }}
      />
    </button>
  );

  if (roomFull) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Room is Full</h2>
          <p style={{ color: '#6b7280' }}>Maximum 2 users allowed. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9fafb',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>
        {`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #ffffff;
          }
          
          #root {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background: #ffffff;
          }
          
          /* Top Toolbar */
          .top-toolbar {
            position: fixed;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 4px;
            z-index: 1000;
            cursor: auto !important;
          }
          
          .top-toolbar * {
            cursor: pointer !important;
          }
          
          .toolbar-btn {
            border: none;
            background: none;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer !important;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
            font-size: 16px;
            color: #374151;
            min-width: 36px;
            min-height: 36px;
          }
          
          .toolbar-btn:hover {
            background-color: #f3f4f6;
          }
          
          .toolbar-btn.active {
            background-color: #e0e7ff;
            color: #3730a3;
          }
          
          .toolbar-divider {
            width: 1px;
            height: 24px;
            background-color: #e5e7eb;
            margin: 0 4px;
          }
          
          /* Left Sidebar */
          .left-sidebar {
            position: fixed;
            top: 80px;
            left: 16px;
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            width: 240px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            z-index: 999;
            transition: transform 0.3s ease;
            transform: translateX(${sidebarOpen ? '0' : '-100%'});
          }
          
          .sidebar-section {
            margin-bottom: 20px;
          }
          
          .sidebar-section:last-child {
            margin-bottom: 0;
          }
          
          .sidebar-title {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }
          
          .color-grid {
            display: flex;
            gap: 8px;
            padding: 12px 8px;
            margin-bottom: 8px;
            overflow-x: auto;
            overflow-y: hidden;
            background: #f9fafb;
            border-radius: 8px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }
          
          .color-grid::-webkit-scrollbar {
            height: 4px;
          }
          
          .color-grid::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .color-grid::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 2px;
          }
          
          .color-btn {
            border: none;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            border-radius: 8px;
            cursor: pointer !important;
            transition: all 0.15s ease;
            border: 2px solid transparent;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          }
          
          .color-btn:hover {
            transform: scale(1.1);
          }
          
          .color-btn.active {
            border-color: #3730a3;
            transform: scale(1.1);
            box-shadow: 0 0 0 2px rgba(55, 48, 163, 0.3);
          }
          
          .stroke-options {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .stroke-btn {
            border: none;
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer !important;
            transition: all 0.15s ease;
            border: 2px solid transparent;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .stroke-btn:hover {
            background-color: #f3f4f6;
          }
          
          .stroke-btn.active {
            background-color: #e0e7ff;
            border-color: #3730a3;
          }
          
          .opacity-slider {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: #e5e7eb;
            outline: none;
            -webkit-appearance: none;
            margin: 8px 0;
          }
          
          .opacity-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3730a3;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .opacity-labels {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          
          /* Bottom Controls */
          .bottom-controls {
            position: fixed;
            bottom: 16px;
            left: 16px;
            background: white;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 999;
          }
          
          .zoom-btn {
            border: none;
            background: none;
            padding: 6px;
            border-radius: 4px;
            cursor: pointer !important;
            color: #374151;
            font-size: 14px;
            min-width: 32px;
            min-height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .zoom-btn:hover {
            background-color: #f3f4f6;
          }
          
          .zoom-level {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
            min-width: 40px;
            text-align: center;
          }
          
          /* Voice Notes */
          .voice-note {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #3b82f6;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.15s ease;
            z-index: 100;
          }
          
          .voice-note:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          
          .voice-note.playing {
            animation: pulse 1s ease-in-out infinite;
          }
          
          .voice-note.dragging {
            transform: scale(1.1);
            z-index: 1000;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          /* Library Button */
          .library-btn {
            position: fixed;
            top: 16px;
            right: 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer !important;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            z-index: 1000;
          }
          
          .library-btn:hover {
            background-color: #f9fafb;
          }
          
          /* Sidebar Toggle */
          .sidebar-toggle {
            position: fixed;
            top: 16px;
            left: 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer !important;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            min-height: 40px;
          }
          
          .sidebar-toggle:hover {
            background-color: #f9fafb;
          }

          /* Eraser Cursor */
          .eraser-cursor {
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            border: 2px solid #374151;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            transform: translate(-50%, -50%);
          }

          .eraser-trail-point {
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            background: rgba(239, 68, 68, 0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: eraser-fade 300ms ease-out forwards;
          }

          @keyframes eraser-fade {
            0% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.3);
            }
          }
        `}
      </style>

      {/* Sidebar Toggle */}
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <span style={{ fontSize: '18px' }}>☰</span>
      </button>

      {/* Top Toolbar */}
      <div className="top-toolbar">
        <ToolbarButton icon={<Hand size={18} />} active={currentTool === 'hand'} onClick={() => setCurrentTool('hand')} title="Hand" />
        <div className="toolbar-divider" />
        <ToolbarButton icon={<Square size={18} />} active={currentTool === 'rectangle'} onClick={() => setCurrentTool('rectangle')} title="Rectangle" />
        <ToolbarButton icon={<Diamond size={18} />} active={currentTool === 'diamond'} onClick={() => setCurrentTool('diamond')} title="Diamond" />
        <ToolbarButton icon={<Circle size={18} />} active={currentTool === 'circle'} onClick={() => setCurrentTool('circle')} title="Circle" />
        <ToolbarButton icon={<ArrowRight size={18} />} active={currentTool === 'arrow'} onClick={() => setCurrentTool('arrow')} title="Arrow" />
        <ToolbarButton icon={<Minus size={18} />} active={currentTool === 'line'} onClick={() => setCurrentTool('line')} title="Line" />
        <div className="toolbar-divider" />
        <ToolbarButton icon={<PenTool size={18} />} active={currentTool === 'pen'} onClick={() => setCurrentTool('pen')} title="Pen" />
        <ToolbarButton icon={<Type size={18} />} active={currentTool === 'text'} onClick={() => setCurrentTool('text')} title="Text" />
        <ToolbarButton icon={<Eraser size={18} />} active={currentTool === 'eraser'} onClick={() => setCurrentTool('eraser')} title="Eraser" />
        <ToolbarButton icon={<Mic size={18} />} active={isRecording} onClick={isRecording ? stopRecording : startRecording} title={isRecording ? 'Stop Recording' : 'Record Voice Note'} />
        <div className="toolbar-divider" />
        <ToolbarButton icon={<Trash2 size={18} />} active={false} onClick={handleClearCanvas} title="Clear Canvas" />
      </div>

      {/* Library Button */}
      {/* <button 
        className="library-btn"
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <span style={{ fontSize: '16px' }}>📚</span>
        Library
      </button> */}

      {/* Left Sidebar */}
      <div 
        className="left-sidebar"
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <div className="sidebar-section">
          <div className="sidebar-title">Stroke</div>
          <div className="color-grid">
            {strokeColors.map(color => (
              <ColorButton
                key={color}
                color={color}
                active={drawingColor === color}
                onClick={setDrawingColor}
              />
            ))}
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Background</div>
          <div className="color-grid">
            {backgroundColors.map(color => (
              <ColorButton
                key={color}
                color={color}
                active={backgroundColor === color}
                onClick={setBackgroundColor}
              />
            ))}
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Stroke width</div>
          <div className="stroke-options">
            <StrokeWidthButton width={1} active={strokeWidth === 1} onClick={setStrokeWidth} />
            <StrokeWidthButton width={2} active={strokeWidth === 2} onClick={setStrokeWidth} />
            <StrokeWidthButton width={4} active={strokeWidth === 4} onClick={setStrokeWidth} />
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Opacity</div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
            className="opacity-slider"
          />
          <div className="opacity-labels">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div 
        className="bottom-controls"
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <button 
          className="zoom-btn"
          onClick={() => setScale(Math.max(0.25, scale - 0.25))}
        >
          −
        </button>
        <div className="zoom-level">{Math.round(scale * 100)}%</div>
        <button 
          className="zoom-btn"
          onClick={() => setScale(Math.min(3, scale + 0.25))}
        >
          +
        </button>
        <div className="toolbar-divider" />
        <button 
          className="zoom-btn" 
          onClick={() => {
            setScale(1);
            setPanX(0);
            setPanY(0);
          }}
          title="Reset zoom and center"
        >
          ⟲
        </button>
        <button 
          className="zoom-btn" 
          onClick={() => setScale(Math.min(3, scale * 1.2))}
          title="Zoom in"
        >
          🔍
        </button>
      </div>

      {/* Main Canvas */}
      <div
        ref={(node) => {
          containerRef.current = node;
          drawingBoardRef.current = node;
        }}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          cursor: currentTool === 'pen' ? 'crosshair' : (currentTool === 'eraser' ? 'none' : 'default')
        }}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleDrawingBoardMouseMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleDrawingBoardMouseEnter}
        onMouseLeave={handleDrawingBoardMouseLeave}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: draggingNote ? 'grabbing' : (currentTool === 'pen' ? 'crosshair' : (currentTool === 'hand' ? 'grab' : (currentTool === 'eraser' ? 'none' : 'default')))
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onWheel={handleWheel}
        />

        {/* Voice note indicators */}
        {voiceNotes.map(note => {
          const isPlaying = playingNotes.has(note.id);
          const isDragging = draggingNote === note.id;

          // Convert logical coordinates to screen coordinates for positioning
          const screenX = note.x * scale + panX;
          const screenY = note.y * scale + panY;

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
                left: screenX - 20,
                top: screenY - 20,
                backgroundColor: note.userColor || '#3b82f6',
              }}
              title="Click to play, drag to move"
            >
              {isPlaying ? '⏸' : '▶'}
            </div>
          );
        })}

        {/* Text input */}
        {editingText && (
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              } else if (e.key === 'Escape') {
                setEditingText(null);
                setTextInput('');
              }
            }}
            onBlur={handleTextSubmit}
            style={{
              position: 'absolute',
              left: editingText.x * scale + panX,
              top: editingText.y * scale + panY - 20,
              border: '1px solid #ccc',
              background: 'white',
              padding: '4px 8px',
              fontSize: '16px',
              borderRadius: '4px',
              minWidth: '100px',
              zIndex: 1000
            }}
            autoFocus
            placeholder="Enter text..."
          />
        )}

      {/* Custom Eraser Cursor - Outside main container */}
      <div
        ref={eraserCursorRef}
        className="eraser-cursor"
        style={{
          left: 0,
          top: 0,
          width: eraserSize,
          height: eraserSize,
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      />

        {/* Eraser trail animation */}
        {eraserTrail.map((point) => (
          <div
            key={point.id}
            className="eraser-trail-point"
            style={{
              left: point.x,
              top: point.y,
              width: eraserSize * 0.6,
              height: eraserSize * 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );

};

export default Canvas;