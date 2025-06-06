'use client';

import React from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  size?: number;
  color?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  size = 24,
  color = '#4B5563',
}) => {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `3px solid rgba(0, 0, 0, 0.1)`,
          borderRadius: '50%',
          borderTop: `3px solid ${color}`,
          animation: 'spin 1s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingIndicator;
