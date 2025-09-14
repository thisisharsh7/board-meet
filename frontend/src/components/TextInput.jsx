const TextInput = ({ 
  editingText,
  textInput,
  setTextInput,
  handleTextSubmit,
  setEditingText,
  scale,
  panX,
  panY
}) => {
  if (!editingText) return null;

  return (
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
  );
};

export default TextInput;