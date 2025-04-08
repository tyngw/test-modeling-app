// src/components/menuBar/Divider.tsx
import React from 'react';

interface DividerProps {
  color: string;
}

const Divider: React.FC<DividerProps> = ({ color }) => {
  return (
    <div 
      style={{ 
        width: '10px', 
        backgroundColor: color, 
        height: '60%', 
        margin: '0 5px', 
        opacity: 0.3 
      }}
    ></div>
  );
};

export default Divider;