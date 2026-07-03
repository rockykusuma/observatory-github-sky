import { useEffect, useRef } from "react";

// Canvas starfield: twinkling stars + occasional shooting star.
export default function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let stars = [];
    let meteor = null;

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const count = Math.min(240, Math.floor((window.innerWidth * window.innerHeight) / 6500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.3 + 0.2,
        base: Math.random() * 0.5 + 0.25,
        speed: Math.random() * 1.6 + 0.4,
        phase: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.06,
      }));
    };

    const spawnMeteor = () => {
      if (Math.random() < 0.004 && !meteor) {
        meteor = {
          x: Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.2,
          y: Math.random() * window.innerHeight * 0.3,
          vx: -(Math.random() * 6 + 5),
          vy: Math.random() * 3 + 2,
          life: 1,
        };
      }
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of stars) {
        const tw = s.base + Math.sin(t / 1000 * s.speed + s.phase) * s.base * 0.9;
        ctx.globalAlpha = Math.max(0.05, tw);
        ctx.fillStyle = s.gold ? "#f5c451" : "#dce4ff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      spawnMeteor();
      if (meteor) {
        const grad = ctx.createLinearGradient(
          meteor.x, meteor.y,
          meteor.x - meteor.vx * 8, meteor.y - meteor.vy * 8
        );
        grad.addColorStop(0, `rgba(245, 224, 165, ${meteor.life})`);
        grad.addColorStop(1, "rgba(245, 224, 165, 0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x - meteor.vx * 8, meteor.y - meteor.vy * 8);
        ctx.stroke();
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life -= 0.02;
        if (meteor.life <= 0) meteor = null;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas className="starfield" ref={ref} aria-hidden="true" />
      <div className="nebula" aria-hidden="true" />
    </>
  );
}
