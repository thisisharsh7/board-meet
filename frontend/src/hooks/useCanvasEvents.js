import { useState, useRef, useCallback } from 'react';
import { getLogicalCoordinates, distanceToLineSegment } from '../utils/canvasUtils';

export const useCanvasEvents = ({
  canvasRef,
  currentTool,
  scale,
  panX,
  panY,
  drawingColor,
  strokeWidth,
  opacity,
  userId,
  drawLine,
  drawingData,
  setDrawingData,
  shapes,
  setShapes,
  textElements,
  setTextElements,
  eraserSize,
  socketRef,
  redrawCanvas,
  voiceNotes,
  setVoiceNotes,
  mousePositionRef
}) => {
  const lastPositionRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggingNote, setDraggingNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // UI State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPos, setShapeStartPos] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  
  // Text editing state
  const [editingText, setEditingText] = useState(null);
  const [textInput, setTextInput] = useState('');
  
  // Eraser state
  const [eraserTrail, setEraserTrail] = useState([]);

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

    // Erase voice notes
    const newVoiceNotes = voiceNotes.filter(note => {
      const distance = Math.sqrt(
        Math.pow(coords.x - note.x, 2) + Math.pow(coords.y - note.y, 2)
      );
      return distance > eraseRadius;
    });

    if (newVoiceNotes.length !== voiceNotes.length) {
      setVoiceNotes(newVoiceNotes);
      console.log('Emitting erase-voice-notes event:', { x: coords.x, y: coords.y, radius: eraseRadius });
      socketRef.current.emit('erase-voice-notes', { x: coords.x, y: coords.y, radius: eraseRadius });
    }
  }, [eraserSize, drawingData, shapes, textElements, voiceNotes, scale, panX, panY, currentTool, setDrawingData, setShapes, setTextElements, setVoiceNotes, socketRef]);

  const startDrawing = useCallback((e) => {
    if (draggingNote) return;
    
    if (currentTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }
    
    const logicalCoords = getLogicalCoordinates(e, canvasRef, scale, panX, panY);
    
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
  }, [draggingNote, currentTool, panX, panY, scale, drawingColor, strokeWidth, opacity, userId, canvasRef, eraseAtPosition]);

  const draw = useCallback((e) => {
    if (draggingNote) return;
    
    const logicalCoords = getLogicalCoordinates(e, canvasRef, scale, panX, panY);
    
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
      
      const updatedShape = {
        ...currentShape,
        width: width,
        height: height
      };
      
      setCurrentShape(updatedShape);
      
      // Redraw canvas to show current shape
      redrawCanvas(updatedShape);
    }
  }, [isDrawing, isDrawingShape, drawLine, draggingNote, drawingColor, strokeWidth, opacity, userId, currentTool, scale, panX, panY, shapeStartPos, currentShape, redrawCanvas, canvasRef, eraseAtPosition, setDrawingData, socketRef]);

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
  }, [isDrawingShape, currentShape, setShapes, socketRef]);

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
  }, [editingText, textInput, setTextElements, socketRef]);

  // Voice note drag handlers
  const [dragStartTime, setDragStartTime] = useState(null);
  const [dragStartPos, setDragStartPos] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const dragTimeoutRef = useRef(null);

  const handleVoiceNoteMouseDown = useCallback((e, note) => {
    e.stopPropagation();
    e.preventDefault();

    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    // Convert to logical coordinates
    const logicalCoords = getLogicalCoordinates(e, canvasRef, scale, panX, panY);

    // Don't immediately set dragging - wait for mouse move or timeout
    setDragStartTime(Date.now());
    setDragStartPos(logicalCoords);
    setHasMoved(false);
    setDragOffset({
      x: logicalCoords.x - note.x,
      y: logicalCoords.y - note.y
    });

    // Store the note ID but don't set as dragging yet
    setDraggingNote(note.id);

    // Clear dragging state after a short timeout if no movement occurs
    dragTimeoutRef.current = setTimeout(() => {
      setDraggingNote(null);
      setDragStartTime(null);
      setDragStartPos(null);
      setDragOffset({ x: 0, y: 0 });
      setHasMoved(false);
    }, 150);
  }, [canvasRef, scale, panX, panY]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;

    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      return { newPanX, newPanY };
    }

    // Convert to logical coordinates for voice notes
    const logicalCoords = getLogicalCoordinates(e, canvasRef, scale, panX, panY);
    mousePositionRef.current = logicalCoords;

    // Check if we should start dragging (mouse moved enough distance)
    if (draggingNote && dragStartPos && !hasMoved) {
      const distance = Math.sqrt(
        Math.pow(logicalCoords.x - dragStartPos.x, 2) +
        Math.pow(logicalCoords.y - dragStartPos.y, 2)
      );

      // If mouse moved more than 5 units, consider it a drag
      if (distance > 5) {
        // Clear the timeout since we're actually dragging
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
        }
        setHasMoved(true);
      }
    }

    if (draggingNote && hasMoved) {
      const newX = logicalCoords.x - dragOffset.x;
      const newY = logicalCoords.y - dragOffset.y;

      setVoiceNotes(prev => prev.map(note =>
        note.id === draggingNote
          ? { ...note, x: newX, y: newY }
          : note
      ));
    }

    return null;
  }, [draggingNote, dragOffset, isPanning, panStart, scale, panX, panY, canvasRef, setVoiceNotes, mousePositionRef, dragStartPos, hasMoved]);

  const handleMouseUp = useCallback(() => {
    // Clear any pending timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggingNote) {
      // Only emit position update if note actually moved
      if (hasMoved) {
        const draggedNote = voiceNotes.find(note => note.id === draggingNote);
        if (draggedNote) {
          socketRef.current.emit('voice-note-moved', {
            id: draggedNote.id,
            x: draggedNote.x,
            y: draggedNote.y
          });
        }
      }

      // Always clean up drag state on mouse up
      setDraggingNote(null);
      setDragOffset({ x: 0, y: 0 });
      setDragStartTime(null);
      setDragStartPos(null);
      setHasMoved(false);
    }
  }, [draggingNote, voiceNotes, isPanning, socketRef, hasMoved]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    return delta;
  }, []);

  return {
    isDrawing,
    draggingNote,
    hasMoved,
    dragOffset,
    isPanning,
    panStart,
    isDrawingShape,
    shapeStartPos,
    currentShape,
    editingText,
    textInput,
    setTextInput,
    eraserTrail,
    setEraserTrail,
    startDrawing,
    draw,
    stopDrawing,
    handleTextSubmit,
    handleVoiceNoteMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    setEditingText,
    setIsPanning,
    setPanStart
  };
};