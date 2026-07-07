import React from "react";

interface MovingBorderButtonProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const MovingBorderButton: React.FC<MovingBorderButtonProps> = ({ 
  onClick, 
  className = "", 
  children 
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-[1.5px] overflow-hidden rounded-[20px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none shadow-md hover:shadow-lg hover:shadow-purple-500/10 ${className}`}
    >
      {/* Moving border gradient spinner */}
      <span className="absolute inset-0 bg-[conic-gradient(from_0deg,#c084fc,#818cf8,#60a5fa,#c084fc)] animate-[spin_5s_linear_infinite]" />
      
      {/* Internal button surface */}
      <span className="relative block px-6 py-2.5 bg-white dark:bg-slate-900 rounded-[18.5px] text-slate-800 dark:text-slate-200 text-xs font-extrabold hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition duration-200">
        {children}
      </span>
    </button>
  );
};
