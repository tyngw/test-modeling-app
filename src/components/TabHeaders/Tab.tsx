// src/components/TabHeaders/TabHeader.tsx
import React from 'react';
import { TabState } from '../../context/tabsContext';
import { useIsMounted } from '../../hooks/useIsMounted';

interface TabHeaderProps {
  tab: TabState;
  isCurrent: boolean;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  theme: any; // Using any type for simplicity, should ideally use a proper Theme type
}

const Tab: React.FC<TabHeaderProps> = React.memo(({ 
  tab, 
  isCurrent, 
  closeTab, 
  switchTab,
  theme
}) => {
  const isMounted = useIsMounted();

  if (!isMounted) return null;

  return (
    <div
      style={{
        padding: '6px',
        marginRight: '4px',
        backgroundColor: isCurrent ? theme.TAB_BAR.ACTIVE_TAB_BACKGROUND : theme.TAB_BAR.INACTIVE_TAB_BACKGROUND,
        borderBottom: isCurrent ? `3px solid ${theme.TAB_BAR.ACTIVE_TAB_BORDER}` : 'none',
        paddingBottom: '3px',
        borderRadius: '5px 5px 0 0',
        fontSize: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: theme.TAB_BAR.TAB_TEXT,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: '48px',
        maxWidth: '150px'
      }}
      onClick={() => switchTab(tab.id)}
    >
      <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '0' }}>{tab.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        style={{ 
          flex: '0 0 auto',
          marginLeft: '2px',
          border: '0',
          backgroundColor: 'transparent',
          fontSize: '16px',
          color: theme.TAB_BAR.CLOSE_BUTTON_COLOR,
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