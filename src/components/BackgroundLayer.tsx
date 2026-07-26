import React, { useEffect, useRef } from 'react';

export const BackgroundLayer = ({ effect, color, reducedMotion }: { effect?: string; color?: string; reducedMotion: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!effect || effect === 'none' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialization
    if (effect === 'twinkle' || effect === 'sparkle') {
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          alpha: Math.random(),
          velocity: (Math.random() * 0.02) + 0.01,
          glow: effect === 'sparkle' ? Math.random() * 5 + 2 : 0,
        });
      }
    } else if (effect === 'confetti') {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          w: Math.random() * 10 + 5,
          h: Math.random() * 10 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 3 + 2,
          rot: Math.random() * 360,
          rotSpeed: Math.random() * 10 - 5
        });
      }
    } else if (effect === 'bokeh') {
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 50 + 20,
          vx: Math.random() * 0.5 - 0.25,
          vy: Math.random() * -0.5 - 0.2,
          alpha: Math.random() * 0.3 + 0.1
        });
      }
    } else if (effect === 'bubbles') {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 20 + 5,
          vy: Math.random() * -1 - 0.5,
          vx: Math.sin(Math.random() * 100) * 0.5
        });
      }
    } else if (effect === 'glow') {
      particles.push({ phase: 0 });
    }

    let time = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (effect === 'twinkle' || effect === 'sparkle') {
        particles.forEach(p => {
          if (!reducedMotion) p.alpha += p.velocity;
          if (p.alpha >= 1 || p.alpha <= 0) p.velocity *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, p.alpha)})`;
          if (p.glow) {
            ctx.shadowBlur = p.glow;
            ctx.shadowColor = 'white';
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      } else if (effect === 'confetti') {
        particles.forEach(p => {
          if (!reducedMotion) {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotSpeed;
          }
          if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          ctx.restore();
        });
      } else if (effect === 'gradient') {
        if (!reducedMotion) time += 0.01;
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, `hsla(${time * 50 % 360}, 70%, 80%, 0.5)`);
        grad.addColorStop(1, `hsla(${(time * 50 + 60) % 360}, 70%, 80%, 0.5)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (effect === 'bokeh') {
        particles.forEach(p => {
          if (!reducedMotion) {
            p.x += p.vx;
            p.y += p.vy;
          }
          if (p.y < -p.radius) p.y = canvas.height + p.radius;
          if (p.x < -p.radius) p.x = canvas.width + p.radius;
          if (p.x > canvas.width + p.radius) p.x = -p.radius;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();
        });
      } else if (effect === 'bubbles') {
        particles.forEach(p => {
          if (!reducedMotion) {
            p.y += p.vy;
            p.x += Math.sin(p.y * 0.05) * 0.5;
          }
          if (p.y < -p.radius) p.y = canvas.height + p.radius;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fill();
        });
      } else if (effect === 'glow') {
        if (!reducedMotion) time += 0.02;
        const p = particles[0];
        const intensity = (Math.sin(time) + 1) / 2 * 0.3 + 0.1;
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
        grad.addColorStop(0, `rgba(255, 200, 100, ${intensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [effect, reducedMotion]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: color || '#ffffff' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
