import { useEffect, useRef } from 'react';

export function FXOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create noise pattern
    const createNoise = () => {
      // Check if canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) return;
      
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer = new Uint32Array(imageData.data.buffer);
      const len = buffer.length;

      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.1) {
          buffer[i] = 0xff0a0a0a; // Very subtle noise
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    // Animate noise
    const lowMotionMode = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
    let animationId: number;
    const animate = () => {
      createNoise();
      animationId = requestAnimationFrame(animate);
    };
    if (lowMotionMode) {
      createNoise();
    } else {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <>
      {/* Scanlines */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
          mixBlendMode: 'multiply'
        }}
      />
      
      {/* Grain/Noise */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(10, 12, 15, 0.25) 100%)',
        }}
      />
      
      {/* Chromatic aberration (simulated with glow) */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          boxShadow: 'inset 0 0 100px rgba(255, 122, 0, 0.02)',
        }}
      />
    </>
  );
}
