// src/components/TabHeaders/index.tsx
import React, { useContext } from 'react';
import { TabState } from '../../context/tabsContext';
import Tab from './Tab';
import { ICONBAR_HEIGHT, TABBAR_HEIGHT } from '../../constants/elementSettings';
import { getCurrentTheme } from '../../utils/colorHelpers';
import { useCanvas } from '../../context/canvasContext';
import { getCanvasBackgroundColor } from '../../utils/localStorageHelpers';

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
  // localStorage から背景色を取得する
  const backgroundColor = getCanvasBackgroundColor();
  // 取得した背景色をもとにテーマを決定
  const theme = getCurrentTheme(backgroundColor);

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