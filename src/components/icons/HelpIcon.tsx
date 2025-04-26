import React from 'react';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

const HelpIcon: React.FC = () => (
  <div
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #A46365, #B1928A)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <HelpOutlineOutlinedIcon style={{ color: '#ffffff' }} />
  </div>
);

export default HelpIcon;
