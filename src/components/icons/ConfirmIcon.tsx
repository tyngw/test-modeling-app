import React from 'react';

interface ConfirmIconProps {
  bgColor: string;
  iconColor: string;
}

const ConfirmIcon: React.FC<ConfirmIconProps> = ({ bgColor, iconColor }) => (
  <div
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      background: 'linear-gradient(135deg,rgb(99, 107, 224),rgb(47, 62, 171))',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V13" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill={iconColor} />
    </svg>
  </div>
);

export default ConfirmIcon;
