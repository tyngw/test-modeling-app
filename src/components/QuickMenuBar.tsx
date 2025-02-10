// src/components/QuickMenuBar.tsx
import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { ICONBAR_HEIGHT } from '../constants/NodeSettings';
import { useCanvas } from '../context/CanvasContext';

interface QuickMenuBarProps {
  saveSvg: () => void;
  loadNodes: (event: React.ChangeEvent<HTMLInputElement>) => void;
  saveNodes: () => void;
  toggleHelp: () => void;
}

type CanvasActionType = 
  | 'NEW'
  | 'UNDO'
  | 'REDO'
  | 'ZOOM_IN'
  | 'ZOOM_OUT';


  const QuickMenuBar = ({ 
    saveSvg,
    loadNodes,
    saveNodes,
    toggleHelp
  }: QuickMenuBarProps) => {
    const { dispatch } = useCanvas();
    const fileInput = useRef<HTMLInputElement>(null);

  const handleFileOpen = () => {
    fileInput.current?.click();
  };

  const handleAction = (action: CanvasActionType) => () => {
    dispatch({ type: action });
  };

  return (
    <div style={{ position: 'fixed', width: '100%', height: ICONBAR_HEIGHT, zIndex: 10000 }}>
      <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'center', height: '100%', backgroundColor: '#f1f1f1', borderRadius: '30px', padding: '0 20px' }}>
        <input type="file" ref={fileInput} onChange={loadNodes} style={{ display: 'none' }} />
        
        {/* アクションボタンの修正 */}
        <Button variant="text" className="iconbar-button" onClick={handleAction('NEW')}>
          <InsertDriveFileOutlinedIcon sx={{ color: '#666666' }} />
        </Button>
        
        <Button variant="text" className="iconbar-button" onClick={handleFileOpen}>
          <FolderOpenOutlinedIcon sx={{ color: '#666666' }} />
        </Button>
        
        <Button variant="text" className="iconbar-button" onClick={saveNodes}>
          <SaveAsOutlinedIcon sx={{ color: '#666666' }} />
        </Button>
        
        <Button variant="text" className="iconbar-button" onClick={saveSvg}>
          <SaveAltIcon sx={{ color: '#666666' }} />
        </Button>
        
        <div style={{ width: '10px' }}></div>
        
        <Button variant="text" className="iconbar-button" onClick={handleAction('UNDO')}>
          <UndoIcon sx={{ color: '#666666' }} />
        </Button>
        
        <Button variant="text" className="iconbar-button" onClick={handleAction('REDO')}>
          <RedoIcon sx={{ color: '#666666' }} />
        </Button>
        
        <div style={{ width: '10px' }}></div>
        
        <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_IN')}>
          <ZoomInIcon sx={{ color: '#666666' }} />
        </Button>
        
        <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_OUT')}>
          <ZoomOutIcon sx={{ color: '#666666' }} />
        </Button>
        
        <div style={{ width: '10px' }}></div>
        
        <Button variant="text" className="iconbar-button" onClick={toggleHelp}>
          <HelpOutlineOutlinedIcon sx={{ color: '#666666' }} />
        </Button>
      </div>
    </div>
  );
};

export default QuickMenuBar;