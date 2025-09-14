const EraserCursor = ({ eraserCursorRef, eraserSize, eraserTrail }) => {
  return (
    <>
      <div
        ref={eraserCursorRef}
        className="eraser-cursor"
        style={{
          left: 0,
          top: 0,
          width: eraserSize,
          height: eraserSize,
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      />

      {eraserTrail.map((point) => (
        <div
          key={point.id}
          className="eraser-trail-point"
          style={{
            left: point.x,
            top: point.y,
            width: eraserSize * 0.6,
            height: eraserSize * 0.6,
          }}
        />
      ))}
    </>
  );
};

export default EraserCursor;