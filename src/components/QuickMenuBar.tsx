// src/components/QuickMenuBar.tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';

import { ICONBAR_HEIGHT } from '../constants/elementSettings';
import { useCanvas } from '../context/CanvasContext';
import { useTabs } from '../context/TabsContext';
import { getCurrentTheme } from '../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/localStorageHelpers';
import { useIsMounted } from '../hooks/UseIsMounted';
import LoadingIndicator from './LoadingIndicator';
import { tooltipTexts } from '../constants/tooltipTexts';

// 基本コンポーネントのインポート
import IconButton from './menuBar/IconButton';
import Divider from './menuBar/Divider';

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
  }, [dispatch]); // 依存配列を簡略化

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

          {/* ファイル操作グループ */}
          <IconButton
            tooltip={tooltipTexts.NEW}
            onClick={addTab}
            icon={InsertDriveFileOutlinedIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.OPEN}
            onClick={handleFileOpen}
            icon={FolderOpenOutlinedIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.SAVE}
            onClick={saveElements}
            icon={SaveAsOutlinedIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.SAVE_SVG}
            onClick={saveSvg}
            icon={SaveAltIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          
          <Divider color={theme.MENU_BAR.DIVIDER_COLOR} />

          {/* 要素操作グループ */}
          <IconButton
            tooltip={tooltipTexts.ADD}
            onClick={handleAction('ADD_ELEMENT')}
            icon={PlaylistAddIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.DELETE}
            onClick={handleAction('DELETE_ELEMENT')}
            icon={PlaylistRemoveIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.AI}
            onClick={onAIClick}
            icon={AutoFixOffIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.EXPAND}
            onClick={handleAction('EXPAND_ELEMENT')}
            icon={UnfoldMoreIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.COLLAPSE}
            onClick={handleAction('COLLAPSE_ELEMENT')}
            icon={UnfoldLessIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />

          <Divider color={theme.MENU_BAR.DIVIDER_COLOR} />

          {/* 履歴操作グループ */}
          <IconButton
            tooltip={tooltipTexts.UNDO}
            onClick={handleAction('UNDO')}
            icon={UndoIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.REDO}
            onClick={handleAction('REDO')}
            icon={RedoIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />

          <Divider color={theme.MENU_BAR.DIVIDER_COLOR} />

          {/* ズーム操作グループ */}
          <IconButton
            tooltip={tooltipTexts.ZOOM_IN}
            onClick={handleAction('ZOOM_IN')}
            icon={ZoomInIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.ZOOM_OUT}
            onClick={handleAction('ZOOM_OUT')}
            icon={ZoomOutIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />

          <Divider color={theme.MENU_BAR.DIVIDER_COLOR} />

          {/* ユーティリティグループ */}
          <IconButton
            tooltip={tooltipTexts.HELP}
            onClick={toggleHelp}
            icon={HelpOutlineOutlinedIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
          <IconButton
            tooltip={tooltipTexts.SETTINGS}
            onClick={toggleSettings}
            icon={SettingsIcon}
            iconColor={theme.MENU_BAR.ICON_COLOR}
          />
        </div>
      </div>
      {isZoomLoading && (
        <div style={{ position: 'fixed', zIndex: 9500, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <LoadingIndicator isLoading={isZoomLoading} size={32} color="#4B5563" />
        </div>
      )}
    </>
  );
};

export default QuickMenuBar;
