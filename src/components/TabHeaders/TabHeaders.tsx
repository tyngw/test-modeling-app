// src/components/TabHeaders/index.tsx
import React from 'react';
import { TabState } from '../../context/tabsContext';
import Tab from './Tab';
import { ICONBAR_HEIGHT, TABBAR_HEIGHT } from '../../constants/elementSettings';

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
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    width: '100%',
    height: TABBAR_HEIGHT,
    marginTop: ICONBAR_HEIGHT,
    position: 'fixed',
    zIndex: '100001',
  }}>
    {tabs.map(tab => (
      <Tab
        key={tab.id}
        tab={tab}
        isCurrent={currentTabId === tab.id}
        closeTab={closeTab}
        switchTab={switchTab}
      />
    ))}
    <button onClick={addTab} style={{ marginLeft: '8px' }}>
      +
    </button>
  </div>
));

export default TabHeaders;