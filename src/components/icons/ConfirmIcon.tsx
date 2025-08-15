import React from 'react';

const ConfirmIcon: React.FC = () => (
  <div
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6370e0, #2f3eab)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="#ffffff" />
    </svg>
  </div>
);

export default ConfirmIcon;
