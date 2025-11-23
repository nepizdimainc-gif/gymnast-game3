import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, Bar, PlayerState, Point, Particle } from '../types';
import { CONFIG, COLORS } from '../constants';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  
  // Refs for mutable game state (avoids re-renders during game loop)
  const gameStateRef = useRef<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const playerRef = useRef<Player>({
    state: PlayerState.SWINGING,
    x: CONFIG.INITIAL_BAR_X,
    y: CONFIG.INITIAL_BAR_Y + CONFIG.PLAYER_ARM_LENGTH,
    vx: 0,
    vy: 0,
    currentBarId: 0,
    angle: 0,
    angularVelocity: 0,
    armLength: CONFIG.PLAYER_ARM_LENGTH,
    faceDir: 1,
  });
  
  const barsRef = useRef<Bar[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef<Point>({ x: 0, y: 0 });
  const cameraShakeRef = useRef(0);
  const scoreRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  // Sync state ref
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Initialization ---
  const initGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    particlesRef.current = [];
    cameraShakeRef.current = 0;
    
    // Generate Level
    const initialBars: Bar[] = [];
    let currentX = CONFIG.INITIAL_BAR_X;
    let currentY = CONFIG.INITIAL_BAR_Y;
    
    initialBars.push({ id: 0, x: currentX, y: currentY, radius: CONFIG.BAR_RADIUS });
    
    for (let i = 1; i < 10; i++) {
      const next = generateNextBar(currentX, currentY, i);
      initialBars.push(next);
      currentX = next.x;
      currentY = next.y;
    }
    
    barsRef.current = initialBars;
    
    playerRef.current = {
      state: PlayerState.SWINGING,
      x: CONFIG.INITIAL_BAR_X,
      y: CONFIG.INITIAL_BAR_Y + CONFIG.PLAYER_ARM_LENGTH,
      vx: 0,
      vy: 0,
      currentBarId: 0,
      angle: Math.PI / 6,
      angularVelocity: 0.1, 
      armLength: CONFIG.PLAYER_ARM_LENGTH,
      faceDir: 1,
    };
    
    cameraRef.current = { 
        x: CONFIG.INITIAL_BAR_X - CONFIG.CANVAS_WIDTH * 0.3,
        y: CONFIG.INITIAL_BAR_Y - CONFIG.CANVAS_HEIGHT * 0.4 
    };
    
    setGameState('PLAYING');
  }, []);

  const generateNextBar = (prevX: number, prevY: number, id: number): Bar => {
    const distX = CONFIG.MIN_BAR_DIST_X + Math.random() * (CONFIG.MAX_BAR_DIST_X - CONFIG.MIN_BAR_DIST_X);
    // Bias towards middle height to prevent going too high/low
    const targetY = CONFIG.INITIAL_BAR_Y;
    const diffFromTarget = prevY - targetY;
    const bias = diffFromTarget * 0.2; 
    let distY = (Math.random() * (CONFIG.MAX_BAR_DIST_Y - CONFIG.MIN_BAR_DIST_Y) + CONFIG.MIN_BAR_DIST_Y) - bias;
    
    return {
      id,
      x: prevX + distX,
      y: prevY + distY,
      radius: CONFIG.BAR_RADIUS,
    };
  };

  const createParticles = (x: number, y: number, count: number, color: string, speed: number = 2) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * speed;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: 1.0,
        maxLife: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  // --- Input ---
  const handleInput = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') {
      if (gameStateRef.current === 'START' || gameStateRef.current === 'GAMEOVER') initGame();
      return;
    }

    const p = playerRef.current;

    if (p.state === PlayerState.SWINGING) {
      // Release
      p.state = PlayerState.FLYING;
      // IMPORTANT: Do NOT set currentBarId to null here. 
      // We keep it as the "last bar" so we don't immediately re-catch it in the next frame.
      // The collision logic in the loop ignores p.currentBarId.
      
      const tangentX = Math.cos(p.angle);
      const tangentY = -Math.sin(p.angle);
      
      const speed = Math.abs(p.angularVelocity * p.armLength);
      const boost = 1.1; 
      const releaseSpeed = Math.max(speed, 5) * CONFIG.JUMP_POWER_MULTIPLIER * boost;
      
      const dir = p.angularVelocity > 0 ? 1 : -1;
      
      p.vx = releaseSpeed * tangentX * dir;
      p.vy = releaseSpeed * tangentY * dir;

      createParticles(p.x, p.y, 5, 'rgba(255,255,255,0.5)', 1);
    }
  }, [initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
      }
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleInput();
    };
    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        handleInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleInput]);

  // --- Draw Helper ---
  const drawArticulatedPlayer = (ctx: CanvasRenderingContext2D, p: Player, bars: Bar[]) => {
      const armLen = CONFIG.PLAYER_ARM_LENGTH;
      const bodyLen = CONFIG.PLAYER_BODY_LENGTH;
      const legLen = CONFIG.PLAYER_LEG_LENGTH;
      
      let shoulderX = p.x;
      let shoulderY = p.y;
      
      // Default positions
      let handL_X = p.x, handL_Y = p.y + armLen;
      let handR_X = p.x, handR_Y = p.y + armLen;
      let elbowL_X = p.x, elbowL_Y = p.y + armLen/2;
      let elbowR_X = p.x, elbowR_Y = p.y + armLen/2;
      let hipX = p.x, hipY = p.y + bodyLen;
      let kneeL_X = p.x, kneeL_Y = p.y + bodyLen + legLen/2;
      let kneeR_X = p.x, kneeR_Y = p.y + bodyLen + legLen/2;
      let footL_X = p.x, footL_Y = p.y + bodyLen + legLen;
      let footR_X = p.x, footR_Y = p.y + bodyLen + legLen;

      if (p.state === PlayerState.SWINGING && p.currentBarId !== null) {
          const bar = bars.find(b => b.id === p.currentBarId);
          if (bar) {
            handL_X = bar.x - 5; handL_Y = bar.y;
            handR_X = bar.x + 5; handR_Y = bar.y;
            
            shoulderX = p.x;
            shoulderY = p.y;
            
            hipX = shoulderX + Math.sin(p.angle) * bodyLen;
            hipY = shoulderY + Math.cos(p.angle) * bodyLen;
            
            elbowL_X = (shoulderX + handL_X) / 2 - Math.cos(p.angle) * 5;
            elbowL_Y = (shoulderY + handL_Y) / 2 + Math.sin(p.angle) * 5;
            elbowR_X = (shoulderX + handR_X) / 2 + Math.cos(p.angle) * 5;
            elbowR_Y = (shoulderY + handR_Y) / 2 - Math.sin(p.angle) * 5;
            
            const legLag = p.angularVelocity * 10;
            const legAngle = p.angle + legLag;
            
            kneeL_X = hipX + Math.sin(legAngle) * (legLen * 0.5);
            kneeL_Y = hipY + Math.cos(legAngle) * (legLen * 0.5);
            footL_X = kneeL_X + Math.sin(legAngle + 0.2) * (legLen * 0.5);
            footL_Y = kneeL_Y + Math.cos(legAngle + 0.2) * (legLen * 0.5);
            
            kneeR_X = hipX + Math.sin(legAngle - 0.1) * (legLen * 0.5);
            kneeR_Y = hipY + Math.cos(legAngle - 0.1) * (legLen * 0.5);
            footR_X = kneeR_X + Math.sin(legAngle - 0.1 + 0.2) * (legLen * 0.5);
            footR_Y = kneeR_Y + Math.cos(legAngle - 0.1 + 0.2) * (legLen * 0.5);
          }
      } else {
          // FLYING
          const velAngle = Math.atan2(p.vx, p.vy);
          const bodyAngle = Math.atan2(p.vy, p.vx) + Math.PI/2;
          
          hipX = p.x - Math.cos(bodyAngle - Math.PI/2) * bodyLen;
          hipY = p.y - Math.sin(bodyAngle - Math.PI/2) * bodyLen;
          
          const reachAngle = Math.atan2(p.vy, p.vx);
          const handDist = armLen;
          
          handL_X = p.x + Math.cos(reachAngle - 0.2) * handDist;
          handL_Y = p.y + Math.sin(reachAngle - 0.2) * handDist;
          handR_X = p.x + Math.cos(reachAngle + 0.2) * handDist;
          handR_Y = p.y + Math.sin(reachAngle + 0.2) * handDist;
          
          elbowL_X = (p.x + handL_X)/2; 
          elbowL_Y = (p.y + handL_Y)/2 - 5;
          elbowR_X = (p.x + handR_X)/2; 
          elbowR_Y = (p.y + handR_Y)/2 + 5;
          
          kneeL_X = hipX - Math.cos(reachAngle) * (legLen * 0.5);
          kneeL_Y = hipY - Math.sin(reachAngle) * (legLen * 0.5);
          footL_X = kneeL_X - Math.cos(reachAngle + 0.3) * (legLen * 0.5);
          footL_Y = kneeL_Y - Math.sin(reachAngle + 0.3) * (legLen * 0.5);
          
          kneeR_X = hipX - Math.cos(reachAngle) * (legLen * 0.5);
          kneeR_Y = hipY - Math.sin(reachAngle) * (legLen * 0.5);
          footR_X = kneeR_X - Math.cos(reachAngle - 0.3) * (legLen * 0.5);
          footR_Y = kneeR_Y - Math.sin(reachAngle - 0.3) * (legLen * 0.5);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw Order: Back Limbs -> Body -> Front Limbs
      
      // Right Leg (Back)
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeR_X, kneeR_Y);
      ctx.lineTo(footR_X, footR_Y);
      ctx.strokeStyle = COLORS.PANTS;
      ctx.lineWidth = 7;
      ctx.stroke();
      
      ctx.fillStyle = COLORS.SHOES;
      ctx.beginPath(); ctx.arc(footR_X, footR_Y, 5, 0, Math.PI*2); ctx.fill();

      // Right Arm (Back)
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowR_X, elbowR_Y);
      ctx.lineWidth = 8;
      ctx.strokeStyle = COLORS.SHIRT;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(elbowR_X, elbowR_Y);
      ctx.lineTo(handR_X, handR_Y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS.SKIN;
      ctx.stroke();

      // Body
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(hipX, hipY);
      ctx.lineWidth = 14;
      ctx.strokeStyle = COLORS.SHIRT;
      ctx.stroke();
      
      // Head
      const dx = shoulderX - hipX;
      const dy = shoulderY - hipY;
      const headAngle = (dx === 0 && dy === 0) ? -Math.PI/2 : Math.atan2(dy, dx);
      
      const headX = shoulderX + Math.cos(headAngle) * 10;
      const headY = shoulderY + Math.sin(headAngle) * 10;
      
      ctx.fillStyle = COLORS.SKIN;
      ctx.beginPath(); ctx.arc(headX, headY, 9, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = COLORS.HAIR;
      ctx.beginPath(); ctx.arc(headX, headY - 2, 9, Math.PI, Math.PI * 2); ctx.fill();

      // Face
      const faceOffset = p.faceDir * 3;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(headX + faceOffset + 2, headY - 1, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(headX + faceOffset - 2, headY - 1, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath(); ctx.arc(headX + faceOffset + 2.5, headY - 1, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(headX + faceOffset - 1.5, headY - 1, 1, 0, Math.PI*2); ctx.fill();
      
      ctx.beginPath();
      ctx.arc(headX + faceOffset, headY + 3, 3, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#9f1239';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Left Leg (Front)
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeL_X, kneeL_Y);
      ctx.lineTo(footL_X, footL_Y);
      ctx.strokeStyle = COLORS.PANTS;
      ctx.lineWidth = 7;
      ctx.stroke();
      
      ctx.fillStyle = COLORS.SHOES;
      ctx.beginPath(); ctx.arc(footL_X, footL_Y, 5, 0, Math.PI*2); ctx.fill();

      // Left Arm (Front)
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowL_X, elbowL_Y);
      ctx.lineWidth = 8;
      ctx.strokeStyle = COLORS.SHIRT;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(elbowL_X, elbowL_Y);
      ctx.lineTo(handL_X, handL_Y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS.SKIN;
      ctx.stroke();
  };

  // --- Game Loop ---
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameStateRef.current === 'PLAYING') {
      const p = playerRef.current;
      const bars = barsRef.current;

      // Physics
      if (p.state === PlayerState.SWINGING && p.currentBarId !== null) {
        const bar = bars.find(b => b.id === p.currentBarId);
        if (bar) {
          const gravityForce = -CONFIG.SWING_GRAVITY * Math.sin(p.angle);
          p.angularVelocity += gravityForce;
          p.angularVelocity *= CONFIG.SWING_DAMPING;

          if (Math.abs(p.angularVelocity) < CONFIG.SWING_MIN_SPEED) {
              p.angularVelocity += (p.angularVelocity > 0 ? 0.002 : -0.002);
          }

          p.angle += p.angularVelocity;
          p.x = bar.x + Math.sin(p.angle) * p.armLength;
          p.y = bar.y + Math.cos(p.angle) * p.armLength;
          
          if (Math.abs(p.angularVelocity) > 0.01) {
              p.faceDir = p.angularVelocity > 0 ? 1 : -1;
          }
        }
      } else if (p.state === PlayerState.FLYING) {
        p.vy += CONFIG.GRAVITY;
        p.vx *= CONFIG.AIR_RESISTANCE;
        p.vy *= CONFIG.AIR_RESISTANCE;
        p.x += p.vx;
        p.y += p.vy;
        
        if (Math.abs(p.vx) > 0.1) p.faceDir = p.vx > 0 ? 1 : -1;

        if (Math.random() < 0.3) {
            particlesRef.current.push({
                x: p.x - p.vx * 2,
                y: p.y - p.vy * 2,
                vx: (Math.random() - 0.5),
                vy: (Math.random() - 0.5),
                life: 1.0,
                maxLife: 1.0,
                color: 'rgba(255, 255, 255, 0.2)',
                size: Math.random() * 3
            });
        }

        let caught = false;
        const reach = CONFIG.PLAYER_ARM_LENGTH + CONFIG.BAR_CATCH_RADIUS;

        for (const bar of bars) {
          // KEY FIX: Prevent catching the same bar immediately
          if (bar.id === p.currentBarId) continue;

          const dx = p.x - bar.x;
          const dy = p.y - bar.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < reach) {
              const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
              p.state = PlayerState.SWINGING;
              p.currentBarId = bar.id;
              p.angle = Math.atan2(dx, dy);
              
              const tx = Math.cos(p.angle);
              const ty = -Math.sin(p.angle);
              const tangentialSpeed = p.vx * tx + p.vy * ty;
              
              p.angularVelocity = tangentialSpeed / p.armLength;
              p.angularVelocity = Math.max(Math.min(p.angularVelocity, 0.25), -0.25);
              
              createParticles(bar.x, bar.y, 10, COLORS.BAR_ACTIVE);
              cameraShakeRef.current = 5;

              if (bar.id > scoreRef.current) {
                  scoreRef.current = bar.id;
                  setScore(bar.id); // Triggers render, but loop is stable
                  
                  if (bars[bars.length - 1].id - scoreRef.current < 5) {
                      const last = bars[bars.length - 1];
                      barsRef.current.push(generateNextBar(last.x, last.y, last.id + 1));
                  }
                  if (bars.length > 15) barsRef.current.shift();
              }
              caught = true;
              break;
          }
        }

        const safeY = bars.find(b => b.id === scoreRef.current)?.y || 0;
        if (!caught && p.y > safeY + CONFIG.CANVAS_HEIGHT) {
            setGameState('GAMEOVER');
            setHighScore(prev => Math.max(prev, scoreRef.current));
        }
      }

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const pt = particlesRef.current[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life -= 0.03;
          if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      // Camera
      const targetX = p.x + (p.vx * 20) + CONFIG.CAMERA_LOOKAHEAD_X;
      const targetY = p.y + (p.vy * 10);
      const dx = targetX - (cameraRef.current.x + CONFIG.CANVAS_WIDTH * 0.4);
      const dy = targetY - (cameraRef.current.y + CONFIG.CANVAS_HEIGHT * 0.5);
      cameraRef.current.x += dx * CONFIG.CAMERA_SPEED;
      cameraRef.current.y += dy * CONFIG.CAMERA_SPEED;

      if (cameraShakeRef.current > 0) {
          cameraShakeRef.current *= 0.9;
          if (cameraShakeRef.current < 0.5) cameraShakeRef.current = 0;
      }
    }

    // --- Rendering ---
    const shakeX = (Math.random() - 0.5) * cameraShakeRef.current;
    const shakeY = (Math.random() - 0.5) * cameraShakeRef.current;

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraRef.current.x + shakeX, -cameraRef.current.y + shakeY);

    // Draw Bars
    barsRef.current.forEach(bar => {
        ctx.beginPath();
        ctx.moveTo(bar.x, bar.y);
        ctx.lineTo(bar.x, bar.y - 2000);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bar.x, bar.y, bar.radius, 0, Math.PI * 2);
        
        let barColor = COLORS.BAR;
        if (bar.id === playerRef.current.currentBarId) barColor = COLORS.BAR_ACTIVE;
        else if (playerRef.current.state === PlayerState.FLYING) {
             const dist = Math.sqrt((playerRef.current.x - bar.x)**2 + (playerRef.current.y - bar.y)**2);
             if (dist < CONFIG.PLAYER_ARM_LENGTH + CONFIG.BAR_CATCH_RADIUS) {
                 barColor = COLORS.BAR_TARGET;
             }
        }
        ctx.fillStyle = barColor;
        ctx.fill();
        
        if (barColor === COLORS.BAR_TARGET) {
            ctx.shadowColor = COLORS.BAR_TARGET;
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });

    // Draw Particles
    particlesRef.current.forEach(pt => {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Draw Player
    if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'GAMEOVER') {
       drawArticulatedPlayer(ctx, playerRef.current, barsRef.current);
    }

    ctx.restore();

    requestRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden touch-none select-none font-sans">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute top-6 left-6 pointer-events-none z-10">
        <div className="text-white font-black text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] italic tracking-wider">
            {score}
        </div>
        <div className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Очки</div>
      </div>

      <div className="absolute top-6 right-6 text-right pointer-events-none z-10">
        <div className="text-emerald-400 font-bold text-2xl drop-shadow-md">
            TOP: {highScore}
        </div>
      </div>

      {gameState === 'START' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
          <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl text-center border-2 border-slate-700 max-w-md mx-4 transform transition-all">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 italic">
              GYMNAST
            </h1>
            <h2 className="text-2xl font-bold text-white mb-6 tracking-widest">JUMP</h2>
            
            <div className="space-y-4 mb-8 text-slate-300">
               <p className="text-lg">Нажми <span className="font-bold text-cyan-400">ПРОБЕЛ</span> или экран</p>
            </div>

            <button 
              onClick={initGame}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] transform hover:scale-105 transition-all duration-200 active:scale-95"
            >
              ИГРАТЬ
            </button>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md z-20">
          <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl text-center border-2 border-slate-700 max-w-md mx-4 animate-in fade-in zoom-in duration-300">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-3xl font-bold text-white mb-2">Упал!</h2>
            <div className="text-6xl font-black text-cyan-400 my-6 drop-shadow-lg">{score}</div>
            
            <button 
              onClick={initGame}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-8 rounded-xl text-lg border border-slate-500 hover:border-white transition-all transform hover:scale-105"
            >
              Снова
            </button>
          </div>
        </div>
      )}
      
       <div className="absolute bottom-10 w-full text-center pointer-events-none text-white text-sm tracking-widest font-bold opacity-80 animate-pulse">
          TAP / SPACE TO JUMP
       </div>
    </div>
  );
};

export default Game;