import React, { useEffect, useState } from "react";

export const HeroBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Gentle parallax ratios: converts center offset to -20px ... +20px range
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 min-h-full">
      {/* Background glowing blobs with slow floating animations + parallax transforms */}
      <div 
        className="absolute top-[8%] left-[10%] w-[380px] h-[380px] rounded-full bg-purple-500/5 dark:bg-purple-650/10 blur-[90px]"
        style={{
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
          animation: "float-slow-1 20s infinite ease-in-out",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />
      <div 
        className="absolute top-[22%] right-[12%] w-[420px] h-[420px] rounded-full bg-blue-400/5 dark:bg-blue-600/5 blur-[100px]"
        style={{
          transform: `translate3d(${-mousePos.x * 0.75}px, ${-mousePos.y * 0.75}px, 0)`,
          animation: "float-slow-2 25s infinite ease-in-out",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />
      <div 
        className="absolute top-[48%] left-[25%] w-[320px] h-[320px] rounded-full bg-indigo-500/5 dark:bg-indigo-650/5 blur-[85px]"
        style={{
          transform: `translate3d(${mousePos.x * 1.25}px, ${-mousePos.y * 1.25}px, 0)`,
          animation: "float-slow-1 16s infinite ease-in-out reverse",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />
      <div 
        className="absolute bottom-[18%] right-[20%] w-[360px] h-[360px] rounded-full bg-purple-500/5 dark:bg-purple-600/5 blur-[95px]"
        style={{
          transform: `translate3d(${-mousePos.x * 1.1}px, ${mousePos.y * 1.1}px, 0)`,
          animation: "float-slow-2 22s infinite ease-in-out",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />

      {/* Smooth, subtle custom radial glow following mouse pointer */}
      <div 
        className="fixed w-[600px] h-[600px] rounded-full bg-purple-500/[0.015] dark:bg-purple-500/[0.035] blur-[130px] pointer-events-none hidden md:block"
        style={{
          left: `calc(var(--mouse-x, 0px) - 300px)`,
          top: `calc(var(--mouse-y, 0px) - 300px)`,
          transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      />
    </div>
  );
};
