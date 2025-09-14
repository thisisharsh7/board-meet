const RoomFull = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Room is Full</h2>
        <p style={{ color: '#6b7280' }}>Maximum 2 users allowed. Please try again later.</p>
      </div>
    </div>
  );
};

export default RoomFull;