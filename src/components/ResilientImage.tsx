import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle = '[Curs] CS2 · Crazypub'
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#141720] via-[#0E1016] to-[#1A1610] border border-white/10 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-8 h-8 text-amber-500/80 mb-2" />
        <span className="font-display text-xs text-slate-300 tracking-wide">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
