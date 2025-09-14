const DrawingCanvas = ({ 
  canvasRef,
  containerRef,
  drawingBoardRef,
  currentTool,
  draggingNote,
  startDrawing,
  draw,
  stopDrawing,
  handleWheel,
  handleMouseMove,
  handleMouseUp,
  handleDrawingBoardMouseMove,
  handleDrawingBoardMouseEnter,
  handleDrawingBoardMouseLeave
}) => {
  return (
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
    </div>
  );
};

export default DrawingCanvas;