// src/components/TabHeaders/index.tsx
import React, { useEffect, useState } from 'react';
import Tab from './Tab';
import { ICONBAR_HEIGHT, TABBAR_HEIGHT } from '../../config/elementSettings';
import { getCurrentTheme } from '../../utils/style/colorHelpers';
import { getCanvasBackgroundColor } from '../../utils/storage/localStorageHelpers';
import { DEFAULT_CANVAS_BACKGROUND_COLOR } from '../../config/elementSettings';
import { useIsMounted } from '../../hooks/UseIsMounted';
import { TabHeadersProps } from '../../types/tabTypes';

const TabHeaders: React.FC<TabHeadersProps> = React.memo(function TabHeaders({
  tabs,
  currentTabId,
  addTab,
  closeTab,
  switchTab,
}) {
  const isMounted = useIsMounted();
  const [, setBackgroundColor] = useState(DEFAULT_CANVAS_BACKGROUND_COLOR);
  const [theme, setTheme] = useState(() => getCurrentTheme(DEFAULT_CANVAS_BACKGROUND_COLOR));

  useEffect(() => {
    if (!isMounted) return;
    // localStorage から背景色を取得する
    const savedBackgroundColor = getCanvasBackgroundColor();
    setBackgroundColor(savedBackgroundColor);
    setTheme(getCurrentTheme(savedBackgroundColor));
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.TAB_BAR.BACKGROUND,
        width: '100%',
        height: TABBAR_HEIGHT,
        marginTop: ICONBAR_HEIGHT,
        position: 'fixed',
      }}
    >
      {tabs.map((tab) => (
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
          padding: '2px 8px',
        }}
      >
        +
      </button>
    </div>
  );
});

export default TabHeaders;
