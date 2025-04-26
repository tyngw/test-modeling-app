import React from 'react';

const SettingsIcon: React.FC = () => (
  <div
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #2f8f67, #049e01)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.14 12.936a7.943 7.943 0 000-1.873l2.036-1.58a.5.5 0 00.11-.643l-1.926-3.33a.5.5 0 00-.607-.22l-2.397.96a7.982 7.982 0 00-1.62-.938l-.36-2.54A.5.5 0 0014.5 2h-5a.5.5 0 00-.493.422l-.36 2.54a7.982 7.982 0 00-1.62.938l-2.397-.96a.5.5 0 00-.607.22l-1.926 3.33a.5.5 0 00.11.643l2.036 1.58a7.943 7.943 0 000 1.873l-2.036 1.58a.5.5 0 00-.11.643l1.926 3.33a.5.5 0 00.607.22l2.397-.96a7.982 7.982 0 001.62.938l.36 2.54A.5.5 0 009.5 22h5a.5.5 0 00.493-.422l.36-2.54a7.982 7.982 0 001.62-.938l2.397.96a.5.5 0 00.607-.22l1.926-3.33a.5.5 0 00-.11-.643l-2.036-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z"
        fill="#ffffff"
      />
    </svg>
  </div>
);

export default SettingsIcon;
