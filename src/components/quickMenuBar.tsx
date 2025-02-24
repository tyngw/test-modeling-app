// src/components/quickMenuBar.tsx
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
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import Tooltip from '@mui/material/Tooltip';
import { ICONBAR_HEIGHT } from '../constants/elementSettings';
import { useCanvas } from '../context/canvasContext';
import { tooltipTexts } from '../constants/tooltipTexts';
import { useTabs } from '../context/tabsContext';

interface QuickMenuBarProps {
  saveSvg: () => void;
  loadElements: (event: React.ChangeEvent<HTMLInputElement>) => void;
  saveElements: () => void;
  toggleHelp: () => void;
  toggleSettings: () => void;
  onAIClick: () => void;
}

type CanvasActionType =
  | 'UNDO'
  | 'REDO'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'EXPAND_ELEMENT'
  | 'COLLAPSE_ELEMENT';

const QuickMenuBar = ({
  saveSvg,
  loadElements,
  saveElements,
  toggleHelp,
  toggleSettings,
  onAIClick,
}: QuickMenuBarProps) => {
  const { dispatch } = useCanvas();
  const { addTab } = useTabs();
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileOpen = () => {
    fileInput.current?.click();
  };

  const handleAction = (action: CanvasActionType) => () => {
    dispatch({ type: action });
  };

  return (
    <div style={{ position: 'fixed', width: '100%', height: ICONBAR_HEIGHT, zIndex: '100000', }}>
      <div style={{
        display: 'flex',
        justifyContent: 'left',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#f1f1f1',
        padding: '0 20px',
      }}>
        <input type="file" ref={fileInput} onChange={loadElements} style={{ display: 'none' }} />

        <Tooltip title={tooltipTexts.NEW} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={addTab}>
            <InsertDriveFileOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.OPEN} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleFileOpen}>
            <FolderOpenOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={saveElements}>
            <SaveAsOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE_SVG} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={saveSvg}>
            <SaveAltIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.ADD} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ADD_ELEMENT')}>
            <PlaylistAddIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.DELETE} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('DELETE_ELEMENT')}>
            <PlaylistRemoveIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.AI} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={onAIClick}>
            <AutoFixOffIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.EXPAND} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('EXPAND_ELEMENT')}>
            <UnfoldMoreIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.COLLAPSE} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('COLLAPSE_ELEMENT')}>
            <UnfoldLessIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.UNDO} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('UNDO')}>
            <UndoIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.REDO} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('REDO')}>
            <RedoIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.ZOOM_IN} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_IN')}>
            <ZoomInIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.ZOOM_OUT} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_OUT')}>
            <ZoomOutIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px' }}></div>

        <Tooltip title={tooltipTexts.HELP} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={toggleHelp}>
            <HelpOutlineOutlinedIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SETTINGS} componentsProps={{ popper: {sx: {zIndex: 100050,},},}}>
          <Button variant="text" className="iconbar-button" onClick={toggleSettings}>
            <SettingsIcon sx={{ color: '#666666' }} />
          </Button>
        </Tooltip>
      </div>
    </div >
  );
};

export default QuickMenuBar;
