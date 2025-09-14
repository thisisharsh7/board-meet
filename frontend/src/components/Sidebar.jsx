const ColorButton = ({ color, active, onClick }) => (
  <button
    onClick={() => onClick(color)}
    className={`color-btn ${active ? 'active' : ''}`}
    style={{ backgroundColor: color }}
  />
);

const StrokeWidthButton = ({ width, active, onClick }) => (
  <button
    onClick={() => onClick(width)}
    className={`stroke-btn ${active ? 'active' : ''}`}
  >
    <div 
      style={{
        width: '20px',
        height: `${width}px`,
        backgroundColor: '#374151',
        borderRadius: '10px'
      }}
    />
  </button>
);

const Sidebar = ({ 
  sidebarOpen,
  setSidebarOpen,
  strokeColors,
  backgroundColors,
  drawingColor,
  setDrawingColor,
  backgroundColor,
  setBackgroundColor,
  strokeWidth,
  setStrokeWidth,
  opacity,
  setOpacity,
  handleUIElementMouseOver,
  handleUIElementMouseLeave
}) => {
  return (
    <>
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <span style={{ fontSize: '18px' }}>☰</span>
      </button>

      <div 
        className="left-sidebar"
        style={{ transform: `translateX(${sidebarOpen ? '0' : '-100%'})` }}
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      >
        <div className="sidebar-section">
          <div className="sidebar-title">Stroke</div>
          <div className="color-grid">
            {strokeColors.map(color => (
              <ColorButton
                key={color}
                color={color}
                active={drawingColor === color}
                onClick={setDrawingColor}
              />
            ))}
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Background</div>
          <div className="color-grid">
            {backgroundColors.map(color => (
              <ColorButton
                key={color}
                color={color}
                active={backgroundColor === color}
                onClick={setBackgroundColor}
              />
            ))}
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Stroke width</div>
          <div className="stroke-options">
            <StrokeWidthButton width={1} active={strokeWidth === 1} onClick={setStrokeWidth} />
            <StrokeWidthButton width={2} active={strokeWidth === 2} onClick={setStrokeWidth} />
            <StrokeWidthButton width={4} active={strokeWidth === 4} onClick={setStrokeWidth} />
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-title">Opacity</div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
            className="opacity-slider"
          />
          <div className="opacity-labels">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;