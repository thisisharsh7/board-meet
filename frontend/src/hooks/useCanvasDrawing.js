import { useCallback } from 'react';

export const useCanvasDrawing = ({
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
  currentShape
}) => {
  
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, [canvasRef]);

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
  }, [canvasRef, drawingColor, strokeWidth, opacity, scale, panX, panY]);

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
      case 'circle': {
        const radius = Math.sqrt(shapeData.width * shapeData.width + shapeData.height * shapeData.height) / 2;
        const centerX = shapeData.x + shapeData.width / 2;
        const centerY = shapeData.y + shapeData.height / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;
      }
      case 'diamond': {
        const midX = shapeData.x + shapeData.width / 2;
        const midY = shapeData.y + shapeData.height / 2;
        ctx.moveTo(midX, shapeData.y);
        ctx.lineTo(shapeData.x + shapeData.width, midY);
        ctx.lineTo(midX, shapeData.y + shapeData.height);
        ctx.lineTo(shapeData.x, midY);
        ctx.closePath();
        break;
      }
      case 'line':
        ctx.moveTo(shapeData.x, shapeData.y);
        ctx.lineTo(shapeData.x + shapeData.width, shapeData.y + shapeData.height);
        break;
      case 'arrow': {
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
      default:
        break;
    }
    
    if (shapeData.fillColor && shapeData.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [canvasRef, drawingColor, strokeWidth, opacity, scale, panX, panY]);

  // Redraw all stored drawing data
  const redrawCanvas = useCallback((customCurrentShape = null) => {
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
    
    // Step 7: Draw current shape being drawn (use parameter or stored currentShape)
    const shapeToRender = customCurrentShape || currentShape;
    if (shapeToRender) {
      drawShape(shapeToRender);
    }
    
    // Step 8: Draw text elements
    textElements.forEach(textEl => {
      ctx.globalAlpha = (textEl.opacity || opacity) / 100;
      ctx.fillStyle = textEl.color || drawingColor;
      ctx.font = `${textEl.fontSize || 16}px Arial`;
      ctx.fillText(textEl.text, textEl.x, textEl.y);
      ctx.globalAlpha = 1;
    });
  }, [canvasRef, scale, panX, panY, backgroundColor, drawingData, shapes, currentShape, textElements, opacity, drawingColor, strokeWidth, drawShape]);

  return {
    resizeCanvas,
    drawLine,
    drawShape,
    redrawCanvas
  };
};