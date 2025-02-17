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
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Tooltip from '@mui/material/Tooltip';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { useCanvas } from '../context/CanvasContext';
import { tooltipTexts } from '../constants/TooltipTexts';

interface QuickMenuBarProps {
  saveSvg: () => void;
  loadElements: (event: React.ChangeEvent<HTMLInputElement>) => void;
  saveElements: () => void;
  toggleHelp: () => void;
}

type CanvasActionType =
  | 'NEW'
  | 'UNDO'
  | 'REDO'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'EXPAND_NODE'
  | 'COLLAPSE_NODE';

const QuickMenuBar = ({
  saveSvg,
  loadElements,
  saveElements,
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
        <input type="file" ref={fileInput} onChange={loadElements} style={{ display: 'none' }} />

        <Tooltip title={tooltipTexts.NEW}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('NEW')}>
            <InsertDriveFileOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.OPEN}>
          <Button variant="text" className="iconbar-button" onClick={handleFileOpen}>
            <FolderOpenOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE}>
          <Button variant="text" className="iconbar-button" onClick={saveElements}>
            <SaveAsOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE_SVG}>
          <Button variant="text" className="iconbar-button" onClick={saveSvg}>
            <SaveAltIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        {/* 新規要素追加ボタン */}
        <Tooltip title={tooltipTexts.ADD}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ADD_NODE')}>
            <ControlPointIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        {/* 要素削除ボタン */}
        <Tooltip title={tooltipTexts.DELETE}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('DELETE_NODE')}>
            <RemoveCircleOutlineIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        {/* 折りたたみボタン */}
        <Tooltip title={tooltipTexts.COLLAPSE}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('COLLAPSE_NODE')}>
            <UnfoldLessIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        {/* 展開ボタン */}
        <Tooltip title={tooltipTexts.EXPAND}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('EXPAND_NODE')}>
            <UnfoldMoreIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.UNDO}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('UNDO')}>
            <UndoIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.REDO}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('REDO')}>
            <RedoIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.ZOOM_IN}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_IN')}>
            <ZoomInIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.ZOOM_OUT}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_OUT')}>
            <ZoomOutIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.HELP}>
          <Button variant="text" className="iconbar-button" onClick={toggleHelp}>
            <HelpOutlineOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>
      </div>
    </div >
  );
};

export default QuickMenuBar;