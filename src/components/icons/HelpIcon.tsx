import React from 'react';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

interface HelpIconProps {
  bgColor: string;
  iconColor: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ bgColor, iconColor }) => (
  <div
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      background: 'linear-gradient(135deg,rgb(164, 99, 101),rgb(177, 146, 138))',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <HelpOutlineOutlinedIcon style={{ color: iconColor }} />
  </div>
);

export default HelpIcon;
