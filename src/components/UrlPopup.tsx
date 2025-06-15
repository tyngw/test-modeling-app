// src/components/UrlPopup.tsx
'use client';

import React from 'react';
import { openUrlInNewTab } from '../utils/url/urlHelpers';

interface UrlPopupProps {
  url: string;
  isVisible: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

/**
 * モバイル端末でURLをタップ可能にするポップアップコンポーネント
 * Googleスプレッドシートのようなリンク表示を実現
 */
export default function UrlPopup({ url, isVisible, onClose }: UrlPopupProps) {
  if (!isVisible) return null;

  const handleUrlClick = () => {
    openUrlInNewTab(url);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // より高いz-indexを設定
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  };

  const popupStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    margin: '16px',
    maxWidth: '320px',
    width: '100%',
    position: 'relative',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  };

  const urlStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    wordBreak: 'break-all',
    backgroundColor: '#f9fafb',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '12px',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const openButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={backdropStyle} onClick={handleBackdropClick}>
      <div style={popupStyle}>
        <div>
          <h3 style={titleStyle}>リンクを開く</h3>
          <p style={urlStyle}>{url}</p>
        </div>

        <div style={buttonContainerStyle}>
          <button
            style={openButtonStyle}
            onClick={handleUrlClick}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
            }}
          >
            開く
          </button>
          <button
            style={cancelButtonStyle}
            onClick={onClose}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#d1d5db';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
