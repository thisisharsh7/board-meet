import { useRef, useEffect, useCallback } from 'react';

export const useEraserCursor = ({ currentTool, drawingBoardRef }) => {
  const eraserCursorRef = useRef(null);

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
  }, [showCustomCursor, updateCursorPosition, drawingBoardRef]);

  return {
    eraserCursorRef,
    handleDrawingBoardMouseMove,
    handleDrawingBoardMouseEnter,
    handleDrawingBoardMouseLeave,
    handleUIElementMouseOver,
    handleUIElementMouseLeave
  };
};