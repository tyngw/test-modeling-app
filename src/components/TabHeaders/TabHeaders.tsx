// src/components/TabHeaders/index.tsx
import React, { useEffect, useState } from 'react';
import { TabState } from '../../context/tabsContext';
import Tab from './Tab';
import { ICONBAR_HEIGHT, TABBAR_HEIGHT } from '../../constants/elementSettings';
import { getCurrentTheme } from '../../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../../utils/localStorageHelpers';
import { DEFAULT_CANVAS_BACKGROUND_COLOR } from '../../constants/elementSettings';

interface TabHeadersProps {
  tabs: TabState[];
  currentTabId: string;
  addTab: () => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}

const TabHeaders: React.FC<TabHeadersProps> = React.memo(({
  tabs,
  currentTabId,
  addTab,
  closeTab,
  switchTab
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_CANVAS_BACKGROUND_COLOR);
  const [theme, setTheme] = useState(() => getCurrentTheme(DEFAULT_CANVAS_BACKGROUND_COLOR));

  useEffect(() => {
    setIsMounted(true);
    // localStorage から背景色を取得する - only in client-side
    const bgColor = getCanvasBackgroundColor();
    setBackgroundColor(bgColor);
    // 取得した背景色をもとにテーマを決定
    setTheme(getCurrentTheme(bgColor));
  }, []);

  if (!isMounted) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: theme.TAB_BAR.BACKGROUND,
      width: '100%',
      height: TABBAR_HEIGHT,
      marginTop: ICONBAR_HEIGHT,
      position: 'fixed',
    }}>
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          tab={tab}
          isCurrent={currentTabId === tab.id}
          closeTab={closeTab}
          switchTab={switchTab}
          theme={theme}
        />
      ))}
      <button 
        onClick={addTab} 
        style={{ 
          marginLeft: '8px',
          backgroundColor: theme.TAB_BAR.ADD_BUTTON_BACKGROUND,
          color: theme.TAB_BAR.ADD_BUTTON_TEXT,
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '2px 8px'
        }}
      >
        +
      </button>
    </div>
  );
});

export default TabHeaders;