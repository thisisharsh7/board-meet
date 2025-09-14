import { useState, useCallback } from 'react';
import { blobToBase64, getUserInitials } from '../utils/canvasUtils';

export const useVoiceRecording = ({ userId, userColor, mousePositionRef, setVoiceNotes, socketRef }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingNotes, setPlayingNotes] = useState(new Set());

  const startRecording = useCallback(async () => {
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
          mimeType: options.mimeType,
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
  }, [userId, userColor, mousePositionRef, setVoiceNotes, socketRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  const playVoiceNote = useCallback(async (note) => {
    try {
      setPlayingNotes(prev => new Set([...prev, note.id]));

      // Convert base64 back to blob for better compatibility
      const response = await fetch(note.audioData);
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
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
  }, []);

  return {
    isRecording,
    playingNotes,
    startRecording,
    stopRecording,
    playVoiceNote
  };
};