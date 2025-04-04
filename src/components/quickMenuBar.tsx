// src/components/quickMenuBar.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
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
import { getCurrentTheme } from '../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/localStorageHelpers';
import { useIsMounted } from '../hooks/useIsMounted';
import LoadingIndicator from './LoadingIndicator';

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
  const { dispatch, state } = useCanvas();
  const { addTab } = useTabs();
  const fileInput = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useIsMounted();
  const [isZoomLoading, setIsZoomLoading] = useState(false);

  // handleActionをuseCallbackで包み、依存配列を正しく設定
  const handleAction = useCallback((action: CanvasActionType) => () => {
    if (action === 'ZOOM_IN' || action === 'ZOOM_OUT') {
      setIsZoomLoading(true);
      
      // 処理を非同期にして、UIがブロックされるのを防ぐ
      setTimeout(() => {
        dispatch({ type: action });
        
        // ズーム処理完了後、少し遅延させてからローディング表示を終了
        setTimeout(() => {
          setIsZoomLoading(false);
        }, 300);
      }, 50);
    } else {
      dispatch({ type: action });
    }
  }, [dispatch, setIsZoomLoading]); // 依存配列を正しく設定

  if (!isMounted) return null;
  
  // localStorage から背景色を取得する
  const backgroundColor = getCanvasBackgroundColor();
  // 取得した背景色をもとにテーマを決定
  const theme = getCurrentTheme(backgroundColor);

  const handleFileOpen = () => {
    fileInput.current?.click();
  };

  return (
    <>
      <div 
        style={{ 
          position: 'fixed',
          width: '100%',
          height: ICONBAR_HEIGHT,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',  // IEとEdge用
          scrollbarWidth: 'none',   // Firefox用
        }}
        ref={containerRef}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'left',
          alignItems: 'center',
          height: '100%',
          backgroundColor: theme.MENU_BAR.BACKGROUND,
          padding: '0 20px',
          minWidth: 'max-content', // コンテンツ幅を維持
        }}>
          <input type="file" ref={fileInput} onChange={loadElements} style={{ display: 'none' }} />

        <Tooltip title={tooltipTexts.NEW}>
          <Button variant="text" className="iconbar-button" onClick={addTab}>
            <InsertDriveFileOutlinedIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.OPEN}>
          <Button variant="text" className="iconbar-button" onClick={handleFileOpen}>
            <FolderOpenOutlinedIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE}>
          <Button variant="text" className="iconbar-button" onClick={saveElements}>
            <SaveAsOutlinedIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SAVE_SVG}>
          <Button variant="text" className="iconbar-button" onClick={saveSvg}>
            <SaveAltIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px', backgroundColor: theme.MENU_BAR.DIVIDER_COLOR, height: '60%', margin: '0 5px', opacity: 0.3 }}></div>

        <Tooltip title={tooltipTexts.ADD}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ADD_ELEMENT')}>
            <PlaylistAddIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.DELETE}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('DELETE_ELEMENT')}>
            <PlaylistRemoveIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.AI}>
          <Button variant="text" className="iconbar-button" onClick={onAIClick}>
            <AutoFixOffIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.EXPAND}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('EXPAND_ELEMENT')}>
            <UnfoldMoreIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.COLLAPSE}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('COLLAPSE_ELEMENT')}>
            <UnfoldLessIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px', backgroundColor: theme.MENU_BAR.DIVIDER_COLOR, height: '60%', margin: '0 5px', opacity: 0.3 }}></div>

        <Tooltip title={tooltipTexts.UNDO}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('UNDO')}>
            <UndoIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.REDO}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('REDO')}>
            <RedoIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px', backgroundColor: theme.MENU_BAR.DIVIDER_COLOR, height: '60%', margin: '0 5px', opacity: 0.3 }}></div>

        <Tooltip title={tooltipTexts.ZOOM_IN}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_IN')}>
            <ZoomInIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.ZOOM_OUT}>
          <Button variant="text" className="iconbar-button" onClick={handleAction('ZOOM_OUT')}>
            <ZoomOutIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <div style={{ width: '10px', backgroundColor: theme.MENU_BAR.DIVIDER_COLOR, height: '60%', margin: '0 5px', opacity: 0.3 }}></div>

        <Tooltip title={tooltipTexts.HELP}>
          <Button variant="text" className="iconbar-button" onClick={toggleHelp}>
            <HelpOutlineOutlinedIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>

        <Tooltip title={tooltipTexts.SETTINGS}>
          <Button variant="text" className="iconbar-button" onClick={toggleSettings}>
            <SettingsIcon sx={{ color: theme.MENU_BAR.ICON_COLOR }} />
          </Button>
        </Tooltip>
      </div>
    </div >
    {isZoomLoading && (
      <div style={{ position: 'fixed', zIndex: 9500, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <LoadingIndicator isLoading={isZoomLoading} size={32} color="#4B5563" />
      </div>
    )}
    </>
  );
};

export default QuickMenuBar;
