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

    const lowMotion = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
    const noiseScale = lowMotion ? 0.18 : 0.28;
    const frameIntervalMs = lowMotion ? 0 : 90;
    let imageData: ImageData | null = null;
    let buffer: Uint32Array | null = null;
    let animationId = 0;
    let lastFrameTime = 0;

    const resize = () => {
      const width = Math.max(1, Math.floor(window.innerWidth * noiseScale));
      const height = Math.max(1, Math.floor(window.innerHeight * noiseScale));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      imageData = ctx.createImageData(width, height);
      buffer = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!imageData || !buffer || canvas.width === 0 || canvas.height === 0) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        return;
      }

      buffer.fill(0);

      for (let i = 0; i < buffer.length; i += 1) {
        if (Math.random() < 0.025) {
          buffer[i] = 0xff0c0c0c;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const tick = (timestamp: number) => {
      if (lowMotion) {
        if (lastFrameTime === 0) {
          draw();
          lastFrameTime = timestamp;
        }
        return;
      }

      if (timestamp - lastFrameTime >= frameIntervalMs) {
        draw();
        lastFrameTime = timestamp;
      }

      animationId = requestAnimationFrame(tick);
    };

    draw();
    if (!lowMotion) {
      animationId = requestAnimationFrame(tick);
    }

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
