// src/components/TabHeaders/TabHeader.tsx
import React from 'react';
import { TabState } from '../../context/TabsContext';

interface TabHeaderProps {
  tab: TabState;
  isCurrent: boolean;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}

const TabHeader: React.FC<TabHeaderProps> = React.memo(({ 
  tab, 
  isCurrent, 
  closeTab, 
  switchTab 
}) => (
  <div
    style={{
      padding: '8px',
      marginRight: '4px',
      backgroundColor: isCurrent ? '#fff' : '#ddd',
      borderBottom: isCurrent ? 'solid 3px #87CEFA' : '',
      paddingBottom: '3px',
      borderRadius: '5px 5px 0 0',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    }}
    onClick={() => switchTab(tab.id)}
  >
    <span>{tab.name}</span>
    <button
      onClick={(e) => {
        e.stopPropagation();
        closeTab(tab.id);
      }}
      style={{ 
        marginLeft: '8px',
        border: '0px',
        backgroundColor: 'transparent',
        fontSize: '16px',
        color: '#666666',
        fontWeight: 'bold',
        cursor: 'pointer',
       }}
    >
      ×
    </button>
  </div>
));

export default TabHeader;