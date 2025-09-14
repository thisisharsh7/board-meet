// Helper function to calculate distance from point to line segment
export const distanceToLineSegment = (point, lineStart, lineEnd) => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));
  
  const xx = lineStart.x + param * C;
  const yy = lineStart.y + param * D;
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
};

// Utility functions
export const generateUserId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getUserInitials = (userId) => {
  if (!userId) return 'U';
  return userId.substr(0, 2).toUpperCase();
};

// Canvas utilities - Convert mouse coordinates to logical canvas coordinates
export const getLogicalCoordinates = (e, canvasRef, scale, panX, panY) => {
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Convert raw mouse coordinates to logical canvas coordinates
  const canvasX = (mouseX - panX) / scale;
  const canvasY = (mouseY - panY) / scale;
  
  return { x: canvasX, y: canvasY };
};

// Convert blob to base64 for sharing across users
export const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};