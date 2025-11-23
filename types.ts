export interface Point {
  x: number;
  y: number;
}

export interface Bar {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export enum PlayerState {
  SWINGING = 'SWINGING',
  FLYING = 'FLYING',
  DEAD = 'DEAD',
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Player {
  state: PlayerState;
  x: number; // Center of mass (Shoulders/Chest)
  y: number;
  vx: number;
  vy: number;
  currentBarId: number | null;
  
  // Swinging physics
  angle: number; // Angle in radians
  angularVelocity: number;
  armLength: number;
  
  // Visuals
  faceDir: number; // 1 or -1
}

export interface GameConfig {
  gravity: number;
  friction: number;
  swingForce: number;
  jumpMultiplier: number;
  cameraSpeed: number;
}