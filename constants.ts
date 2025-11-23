export const CONFIG = {
  GRAVITY: 0.22, // Very floaty for easier control
  AIR_RESISTANCE: 0.995,
  SWING_DAMPING: 0.998, 
  SWING_GRAVITY: 0.02, 
  SWING_MIN_SPEED: 0.06, // Auto-pump if too slow
  
  JUMP_POWER_MULTIPLIER: 2.8, // Explosive jumps
  
  BAR_RADIUS: 6,
  BAR_CATCH_RADIUS: 65, // Massive magnetic catch radius
  
  PLAYER_ARM_LENGTH: 45,
  PLAYER_BODY_LENGTH: 32,
  PLAYER_LEG_LENGTH: 36,
  
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  
  INITIAL_BAR_X: 200,
  INITIAL_BAR_Y: 300,
  
  // Level Generation
  MIN_BAR_DIST_X: 280, 
  MAX_BAR_DIST_X: 450,
  MIN_BAR_DIST_Y: -100, 
  MAX_BAR_DIST_Y: 100,

  CAMERA_SPEED: 0.15,
  CAMERA_LOOKAHEAD_X: 200,
};

export const COLORS = {
  BACKGROUND: '#0f172a', // slate-900
  BAR: '#cbd5e1', // slate-300
  BAR_ACTIVE: '#38bdf8', // sky-400
  BAR_TARGET: '#4ade80', // green-400 (hint)
  TEXT: '#f8fafc',
  
  // Human Colors
  SKIN: '#ffcdb2', 
  SHIRT: '#3b82f6', // Bright Blue
  PANTS: '#1e293b', // Dark Navy
  SHOES: '#ef4444', // Red
  SHOES_DETAIL: '#ffffff',
  HAIR: '#3f3025'
};