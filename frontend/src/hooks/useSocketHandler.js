import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { distanceToLineSegment } from '../utils/canvasUtils';

export const useSocketHandler = ({
  userId,
  setUserCount,
  setRoomFull,
  setDrawingData,
  drawLine,
  setVoiceNotes,
  setShapes,
  setTextElements
}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const isDev = import.meta.env.DEV;
    socketRef.current = io(isDev ? 'http://localhost:3001' : window.location.origin, {
      path: '/api/socket'
    });
    const socket = socketRef.current;

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('user-join', { userId });
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
        const distance = distanceToLineSegment(
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
      setDrawingData([]);
      setVoiceNotes([]);
      setShapes([]);
      setTextElements([]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, setUserCount, setRoomFull, setDrawingData, drawLine, setVoiceNotes, setShapes, setTextElements]);

  return socketRef;
};