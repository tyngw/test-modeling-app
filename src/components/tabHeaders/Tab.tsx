// src/components/TabHeaders/tab.tsx
import React, { useState, useEffect } from 'react';
import { TabHeaderProps } from '../../types/tabTypes';
import { useIsMounted } from '../../hooks/UseIsMounted';
import { isVSCodeExtension } from '../../utils/environment/environmentDetector';
import { storageAdapter } from '../../utils/storage/storageAdapter';

const Tab: React.FC<TabHeaderProps> = React.memo(
  ({ tab, isCurrent, closeTab, switchTab, theme }) => {
    const isMounted = useIsMounted();
    const [isHovered, setIsHovered] = useState(false);
    const [displayName, setDisplayName] = useState(tab.name);

    // VSCode拡張機能でファイル名が変更された場合の処理
    useEffect(() => {
      if (isVSCodeExtension() && isCurrent && storageAdapter.getCurrentFileName) {
        // ファイル名変更のリスナーを設定
        const handleFileNameChange = async () => {
          try {
            const currentFileName = await storageAdapter.getCurrentFileName!();
            if (currentFileName && currentFileName !== tab.name) {
              setDisplayName(currentFileName);
            }
          } catch (error) {
            console.error('ファイル名の取得に失敗しました:', error);
          }
        };

        // VSCode拡張機能のファイル名変更イベントを監視
        if (typeof window !== 'undefined' && (window as any).handleFileNameChanged) {
          (window as any).handleFileNameChanged = (fileName: string) => {
            setDisplayName(fileName);
          };
        }

        handleFileNameChange();
      } else {
        setDisplayName(tab.name);
      }
    }, [tab.name, isCurrent]);

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: '1',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              flex: '0 1 auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: '0',
            }}
          >
            {displayName}
          </span>
          {!tab.isSaved && (
            <span
              style={{
                flex: '0 0 auto',
                marginRight: '0px',
                marginLeft: '2px',
                fontSize: '12px',
              }}
            >
              {'*'}
            </span>
          )}
        </div>
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
            marginRight: '2px',
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
