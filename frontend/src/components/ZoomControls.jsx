const ZoomControls = ({ 
  scale, 
  setScale, 
  setPanX, 
  setPanY,
  handleUIElementMouseOver,
  handleUIElementMouseLeave 
}) => {
  return (
    <div 
      className="bottom-controls"
      onMouseOver={handleUIElementMouseOver}
      onMouseLeave={handleUIElementMouseLeave}
    >
      <button 
        className="zoom-btn"
        onClick={() => setScale(Math.max(0.25, scale - 0.25))}
      >
        −
      </button>
      <div className="zoom-level">{Math.round(scale * 100)}%</div>
      <button 
        className="zoom-btn"
        onClick={() => setScale(Math.min(3, scale + 0.25))}
      >
        +
      </button>
      <div className="toolbar-divider" />
      <button 
        className="zoom-btn" 
        onClick={() => {
          setScale(1);
          setPanX(0);
          setPanY(0);
        }}
        title="Reset zoom and center"
      >
        ⟲
      </button>
      <button 
        className="zoom-btn" 
        onClick={() => setScale(Math.min(3, scale * 1.2))}
        title="Zoom in"
      >
        🔍
      </button>
    </div>
  );
};

export default ZoomControls;