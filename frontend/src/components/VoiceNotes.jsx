const VoiceNotes = ({ 
  voiceNotes,
  playingNotes,
  draggingNote,
  scale,
  panX,
  panY,
  handleVoiceNoteMouseDown,
  playVoiceNote
}) => {
  return (
    <>
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
    </>
  );
};

export default VoiceNotes;