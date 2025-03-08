// src/components/TabHeaders/TabHeader.tsx
import React, { useEffect, useState } from 'react';
import { TabState } from '../../context/tabsContext';

interface TabHeaderProps {
  tab: TabState;
  isCurrent: boolean;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}

const Tab: React.FC<TabHeaderProps> = React.memo(({ 
  tab, 
  isCurrent, 
  closeTab, 
  switchTab 
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div
      style={{
        padding: '8px',
        marginRight: '4px',
        backgroundColor: isCurrent ? '#fff' : '#ddd',
        borderBottom: isCurrent ? '3px solid #87CEFA' : 'none',
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
          border: '0',
          backgroundColor: 'transparent',
          fontSize: '16px',
          color: '#666',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
});

export default Tab;