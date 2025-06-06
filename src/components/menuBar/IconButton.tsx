// src/components/menuBar/IconButton.tsx
import React from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { SvgIconComponent } from '@mui/icons-material';

interface IconButtonProps {
  tooltip: string;
  onClick: () => void;
  icon: SvgIconComponent;
  iconColor: string;
}

const IconButton: React.FC<IconButtonProps> = ({ tooltip, onClick, icon: Icon, iconColor }) => {
  return (
    <Tooltip title={tooltip}>
      <Button variant="text" className="iconbar-button" onClick={onClick}>
        <Icon sx={{ color: iconColor }} />
      </Button>
    </Tooltip>
  );
};

export default IconButton;
