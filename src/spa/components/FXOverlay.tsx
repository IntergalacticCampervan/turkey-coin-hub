import { useEffect, useRef } from 'react';

export function FXOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    let animationId = 0;
    const lowMotion = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        return;
      }

      if (lowMotion && frame > 0) {
        return;
      }

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer = new Uint32Array(imageData.data.buffer);

      for (let i = 0; i < buffer.length; i += 1) {
        if (Math.random() < 0.08) {
          buffer[i] = 0xff0c0c0c;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      frame += 1;

      if (!lowMotion) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <>
      <div className="overlay-scanlines" />
      <canvas ref={canvasRef} className="overlay-noise" aria-hidden="true" />
      <div className="overlay-vignette" />
    </>
  );
}
