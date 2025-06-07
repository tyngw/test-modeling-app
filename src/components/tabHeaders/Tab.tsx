// src/components/TabHeaders/tab.tsx
import React, { useState } from 'react';
import { TabHeaderProps } from '../../types/tabTypes';
import { useIsMounted } from '../../hooks/UseIsMounted';

const Tab: React.FC<TabHeaderProps> = React.memo(
  ({ tab, isCurrent, closeTab, switchTab, theme }) => {
    const isMounted = useIsMounted();
    const [isHovered, setIsHovered] = useState(false);

    if (!isMounted) return null;

    return (
      <div
        style={{
          padding: '6px',
          marginRight: '4px',
          backgroundColor: isCurrent
            ? theme.TAB_BAR.ACTIVE_TAB_BACKGROUND
            : theme.TAB_BAR.INACTIVE_TAB_BACKGROUND,
          borderBottom: isCurrent ? `3px solid ${theme.TAB_BAR.ACTIVE_TAB_BORDER}` : 'none',
          paddingBottom: '3px',
          borderRadius: '5px 5px 0 0',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          color: theme.TAB_BAR.TAB_TEXT,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: '48px',
          maxWidth: '150px',
        }}
        onClick={() => switchTab(tab.id)}
      >
        <span
          style={{
            flex: '1 1 auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: '0',
          }}
        >
          {tab.name}
        </span>

        {/* アスタリスクを閉じるボタンとファイル名の間に配置 */}
        {!tab.isSaved && (
          <span
            style={{
              flex: '0 0 auto',
              marginRight: '2px',
              marginLeft: '2px',
              fontSize: '12px',
            }}
          >
            {' *'}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            flex: '0 0 auto',
            padding: '0px',
            marginLeft: '0px',
            border: '0',
            backgroundColor: 'transparent',
            fontSize: '16px',
            color: isHovered
              ? theme.TAB_BAR.CLOSE_BUTTON_HOVER_COLOR || '#9999ff'
              : theme.TAB_BAR.CLOSE_BUTTON_COLOR,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
          }}
        >
          ×
        </button>
      </div>
    );
  },
);

Tab.displayName = 'Tab';

export default Tab;
