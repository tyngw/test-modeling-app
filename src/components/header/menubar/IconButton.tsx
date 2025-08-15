// src/components/menuBar/IconButton.tsx
import React from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { SvgIconComponent } from '@mui/icons-material';

interface IconButtonProps {
  tooltip: string;
  onClick?: () => void;
  icon?: SvgIconComponent;
  iconColor: string;
  disabled?: boolean;
  customContent?: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({
  tooltip,
  onClick,
  icon: Icon,
  iconColor,
  disabled = false,
  customContent,
}) => {
  const button = (
    <Button variant="text" className="iconbar-button" onClick={onClick} disabled={disabled}>
      {customContent || (Icon && <Icon sx={{ color: iconColor }} />)}
    </Button>
  );

  return <Tooltip title={tooltip}>{disabled ? <span>{button}</span> : button}</Tooltip>;
};

export default IconButton;
