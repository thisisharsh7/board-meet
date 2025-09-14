import { 
  Hand, 
  Square, 
  Diamond, 
  Circle, 
  ArrowRight, 
  Minus, 
  PenTool, 
  Type, 
  Eraser, 
  Mic, 
  Trash2 
} from 'lucide-react';

const ToolbarButton = ({ icon, active, onClick, title, onMouseOver, onMouseLeave }) => (
  <button
    onClick={onClick}
    title={title}
    className={`toolbar-btn ${active ? 'active' : ''}`}
    onMouseOver={onMouseOver}
    onMouseLeave={onMouseLeave}
  >
    {typeof icon === 'string' ? icon : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
  </button>
);

const Toolbar = ({ 
  currentTool, 
  setCurrentTool, 
  isRecording, 
  startRecording, 
  stopRecording, 
  handleClearCanvas,
  handleUIElementMouseOver,
  handleUIElementMouseLeave 
}) => {
  return (
    <div className="top-toolbar">
      <ToolbarButton 
        icon={<Hand size={18} />} 
        active={currentTool === 'hand'} 
        onClick={() => setCurrentTool('hand')} 
        title="Hand" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <div className="toolbar-divider" />
      <ToolbarButton 
        icon={<Square size={18} />} 
        active={currentTool === 'rectangle'} 
        onClick={() => setCurrentTool('rectangle')} 
        title="Rectangle" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Diamond size={18} />} 
        active={currentTool === 'diamond'} 
        onClick={() => setCurrentTool('diamond')} 
        title="Diamond" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Circle size={18} />} 
        active={currentTool === 'circle'} 
        onClick={() => setCurrentTool('circle')} 
        title="Circle" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<ArrowRight size={18} />} 
        active={currentTool === 'arrow'} 
        onClick={() => setCurrentTool('arrow')} 
        title="Arrow" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Minus size={18} />} 
        active={currentTool === 'line'} 
        onClick={() => setCurrentTool('line')} 
        title="Line" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <div className="toolbar-divider" />
      <ToolbarButton 
        icon={<PenTool size={18} />} 
        active={currentTool === 'pen'} 
        onClick={() => setCurrentTool('pen')} 
        title="Pen" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Type size={18} />} 
        active={currentTool === 'text'} 
        onClick={() => setCurrentTool('text')} 
        title="Text" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Eraser size={18} />} 
        active={currentTool === 'eraser'} 
        onClick={() => setCurrentTool('eraser')} 
        title="Eraser" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <ToolbarButton 
        icon={<Mic size={18} />} 
        active={isRecording} 
        onClick={isRecording ? stopRecording : startRecording} 
        title={isRecording ? 'Stop Recording' : 'Record Voice Note'} 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
      <div className="toolbar-divider" />
      <ToolbarButton 
        icon={<Trash2 size={18} />} 
        active={false} 
        onClick={handleClearCanvas} 
        title="Clear Canvas" 
        onMouseOver={handleUIElementMouseOver}
        onMouseLeave={handleUIElementMouseLeave}
      />
    </div>
  );
};

export default Toolbar;