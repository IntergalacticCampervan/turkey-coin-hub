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

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = window.matchMedia('(max-width: 767px)').matches;

    if (reducedMotion || lowPower) {
      root.classList.remove('crt-glitch');
      return;
    }

    let glitchTimer = 0;
    let resetTimer = 0;
    let active = true;

    const scheduleGlitch = () => {
      if (!active) {
        return;
      }

      const delay = 12000 + Math.floor(Math.random() * 13000);
      glitchTimer = window.setTimeout(() => {
        root.classList.add('crt-glitch');
        const burstMs = 100 + Math.floor(Math.random() * 90);
        resetTimer = window.setTimeout(() => {
          root.classList.remove('crt-glitch');
          scheduleGlitch();
        }, burstMs);
      }, delay);
    };

    scheduleGlitch();

    return () => {
      active = false;
      window.clearTimeout(glitchTimer);
      window.clearTimeout(resetTimer);
      root.classList.remove('crt-glitch');
    };
  }, []);

  return (
    <>
      <div className="overlay-scanlines" />
      <canvas ref={canvasRef} className="overlay-noise" aria-hidden="true" />
      <div className="overlay-chromatic" />
      <div className="overlay-vignette" />
      <div className="overlay-curve" />
      <div className="overlay-sync-line" />
    </>
  );
}
