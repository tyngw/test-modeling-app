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
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <HelpOutlineOutlinedIcon style={{ color: iconColor }} />
  </div>
);

export default HelpIcon;
