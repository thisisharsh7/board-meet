const VoiceNotes = ({
  voiceNotes,
  playingNotes,
  draggingNote,
  hasMoved,
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
        const isDragging = draggingNote === note.id && hasMoved;

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
              // Only prevent play if actually dragging (not just mouse down)
              if (!(draggingNote === note.id && hasMoved)) {
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