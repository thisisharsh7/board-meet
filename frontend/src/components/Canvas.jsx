import { useRef, useEffect, useState } from 'react';
import { generateUserId } from '../utils/canvasUtils';
import { useCanvasDrawing } from '../hooks/useCanvasDrawing';
import { useSocketHandler } from '../hooks/useSocketHandler';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useCanvasEvents } from '../hooks/useCanvasEvents';
import { useEraserCursor } from '../hooks/useEraserCursor';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import ZoomControls from './ZoomControls';
import VoiceNotes from './VoiceNotes';
import EraserCursor from './EraserCursor';
import TextInput from './TextInput';
import DrawingCanvas from './DrawingCanvas';
import RoomFull from './RoomFull';
import '../styles/Canvas.css';

const Canvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingBoardRef = useRef(null);
  
  // Basic state
  const [roomFull, setRoomFull] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTool, setCurrentTool] = useState('pen');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // Drawing data
  const [drawingData, setDrawingData] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [voiceNotes, setVoiceNotes] = useState([]);
  
  // Eraser state
  
  // Color management
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  
  // Predefined color palettes
  const strokeColors = ['#000000', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
  const backgroundColors = ['#ffffff', '#fecaca', '#bbf7d0', '#dbeafe', '#fef3c7', '#f3f4f6', '#e0e7ff', '#fce7f3', '#cffafe', '#ecfccb'];

  // Initialize userId
  useEffect(() => {
    setUserId(generateUserId());
  }, []);

  // Canvas drawing hook
  const { resizeCanvas, drawLine, redrawCanvas } = useCanvasDrawing({
    canvasRef,
    scale,
    panX,
    panY,
    drawingColor,
    strokeWidth,
    opacity,
    backgroundColor,
    drawingData,
    shapes,
    textElements,
    currentShape: null // We'll handle currentShape differently
  });

  // Socket handling
  const socketRef = useSocketHandler({
    userId,
    setRoomFull,
    setDrawingData,
    drawLine,
    setVoiceNotes,
    setShapes,
    setTextElements
  });

  // Mouse position ref for voice notes
  const mousePositionRef = useRef({ x: 100, y: 100 });

  // Voice recording
  const { isRecording, playingNotes, startRecording, stopRecording, playVoiceNote } = useVoiceRecording({
    userId,
    userColor: '#3b82f6',
    mousePositionRef,
    setVoiceNotes,
    socketRef
  });

  // Canvas events
  const {
    draggingNote,
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
  } = useCanvasEvents({
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
    eraserSize: 16,
    socketRef,
    redrawCanvas,
    voiceNotes,
    setVoiceNotes,
    mousePositionRef
  });

  // Eraser cursor management
  const {
    eraserCursorRef,
    handleDrawingBoardMouseMove,
    handleDrawingBoardMouseEnter,
    handleDrawingBoardMouseLeave,
    handleUIElementMouseOver,
    handleUIElementMouseLeave
  } = useEraserCursor({ currentTool, drawingBoardRef });

  // Canvas resize and redraw effects
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

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
  }, [eraserTrail.length, setEraserTrail]);

  const clearCanvas = () => {
    setDrawingData([]);
    setShapes([]);
    setTextElements([]);
  };

  const handleClearCanvas = () => {
    clearCanvas();
    socketRef.current.emit('clear-canvas');
  };

  const handleCanvasWheel = (e) => {
    const delta = handleWheel(e);
    const newScale = Math.max(0.25, Math.min(3, scale + delta));
    setScale(newScale);
  };

  const handleCanvasMouseMove = (e) => {
    const panUpdate = handleMouseMove(e);
    if (panUpdate) {
      setPanX(panUpdate.newPanX);
      setPanY(panUpdate.newPanY);
    }
  };

  const handleCanvasMouseUp = () => {
    handleMouseUp();
    setIsPanning(false);
  };

  if (roomFull) {
    return <RoomFull />;
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
      <Toolbar
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
        handleClearCanvas={handleClearCanvas}
        handleUIElementMouseOver={handleUIElementMouseOver}
        handleUIElementMouseLeave={handleUIElementMouseLeave}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        strokeColors={strokeColors}
        backgroundColors={backgroundColors}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        opacity={opacity}
        setOpacity={setOpacity}
        handleUIElementMouseOver={handleUIElementMouseOver}
        handleUIElementMouseLeave={handleUIElementMouseLeave}
      />

      <ZoomControls
        scale={scale}
        setScale={setScale}
        setPanX={setPanX}
        setPanY={setPanY}
        handleUIElementMouseOver={handleUIElementMouseOver}
        handleUIElementMouseLeave={handleUIElementMouseLeave}
      />

      <DrawingCanvas
        canvasRef={canvasRef}
        containerRef={containerRef}
        drawingBoardRef={drawingBoardRef}
        currentTool={currentTool}
        draggingNote={draggingNote}
        startDrawing={startDrawing}
        draw={draw}
        stopDrawing={stopDrawing}
        handleWheel={handleCanvasWheel}
        handleMouseMove={handleCanvasMouseMove}
        handleMouseUp={handleCanvasMouseUp}
        handleDrawingBoardMouseMove={handleDrawingBoardMouseMove}
        handleDrawingBoardMouseEnter={handleDrawingBoardMouseEnter}
        handleDrawingBoardMouseLeave={handleDrawingBoardMouseLeave}
      />

      <VoiceNotes
        voiceNotes={voiceNotes}
        playingNotes={playingNotes}
        draggingNote={draggingNote}
        scale={scale}
        panX={panX}
        panY={panY}
        handleVoiceNoteMouseDown={handleVoiceNoteMouseDown}
        playVoiceNote={playVoiceNote}
      />

      <TextInput
        editingText={editingText}
        textInput={textInput}
        setTextInput={setTextInput}
        handleTextSubmit={handleTextSubmit}
        setEditingText={setEditingText}
        scale={scale}
        panX={panX}
        panY={panY}
      />

      <EraserCursor
        eraserCursorRef={eraserCursorRef}
        eraserSize={16}
        eraserTrail={eraserTrail}
      />
    </div>
  );
};

export default Canvas;