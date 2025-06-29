// src/components/modalWindow.tsx
'use client';

import React, { ReactNode, useState, useEffect, Dispatch, useRef } from 'react';
import { getCurrentTheme } from '../../utils/style/colorHelpers';
import { getCanvasBackgroundColor } from '../../utils/storage/localStorageHelpers';
import { useIsMounted } from '../../hooks/UseIsMounted';
import { Action } from '../../types/actionTypes';

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnOverlayClick?: boolean; // 追加：領域外クリックでの閉じるを制御
  title?: string; // 追加：モーダルのタイトル
  icon?: ReactNode; // 追加：タイトル下に表示するアイコン
  dispatch?: Dispatch<Action>; // 追加：dispatchをオプショナルで受け取る
  modalId?: string; // 追加：モーダルの識別用ID
  onOpen?: () => void; // 追加：モーダルが開かれたときのコールバック
}

const ModalWindow: React.FC<ModalWindowProps> = ({
  isOpen,
  onClose,
  children,
  closeOnOverlayClick = true, // デフォルトでは領域外クリックで閉じる（既存の動作を維持）
  title,
  icon,
  // dispatch, // 未使用なのでコメントアウト
  modalId = 'unknown-modal',
  onOpen,
}) => {
  const isMounted = useIsMounted();
  const [currentTheme, setCurrentTheme] = useState(() =>
    getCurrentTheme(getCanvasBackgroundColor()),
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const renderCount = useRef(0);
  const wasOpenRef = useRef(isOpen);

  // レンダリングの追跡
  useEffect(() => {
    renderCount.current += 1;
    // console.log(`[DEBUG] ModalWindow(${modalId}) rendered #${renderCount.current}, isOpen=${isOpen}`);
  });

  useEffect(() => {
    if (!isMounted) return;
    const backgroundColor = getCanvasBackgroundColor();
    setCurrentTheme(getCurrentTheme(backgroundColor));
    // console.log(`[DEBUG] ModalWindow(${modalId}) theme updated`);
  }, [isMounted, modalId]);

  // モーダルが開かれたときに一度だけonOpenを呼び出す
  useEffect(() => {
    // isOpenがfalseからtrueに変わった時のみ実行
    if (isOpen && !wasOpenRef.current) {
      // console.log(`[DEBUG] ModalWindow(${modalId}) first opened`);
      if (onOpen) {
        onOpen();
      }
    }

    // 現在のisOpenの状態を保存
    wasOpenRef.current = isOpen;

    if (isOpen) {
      // console.log(`[DEBUG] ModalWindow(${modalId}) opened (animation)`);
      setIsAnimating(true);
    }

    return () => {
      if (isOpen) {
        // console.log(`[DEBUG] ModalWindow(${modalId}) cleanup while open`);
      }
    };
  }, [isOpen, modalId, onOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    // アニメーション終了後に閉じる
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleClickOverlay = (_e: React.MouseEvent) => {
    if (closeOnOverlayClick) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  // Modern shadow with layered effect
  const modalShadow = `
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05),
        0 0 0 1px rgba(255, 255, 255, 0.1)
    `;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9000,
        backdropFilter: 'blur(3px)',
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
      onClick={handleClickOverlay}
    >
      <div
        style={{
          backgroundColor: currentTheme.MODAL.BACKGROUND,
          color: currentTheme.MODAL.TEXT_COLOR,
          padding: '20px 24px 24px', // 上部のパディングを減らす
          borderRadius: '16px',
          width: '80%',
          maxWidth: '500px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 9001,
          boxShadow: modalShadow,
          transform: isAnimating ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition:
            'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-in-out',
          opacity: isAnimating ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(icon || title) && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 24,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {icon && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon}
              </div>
            )}
            {title && (
              <div
                style={{
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  color: currentTheme.MODAL.TEXT_COLOR,
                  display: 'flex',
                  alignItems: 'center',
                  height: '32px',
                }}
              >
                {title}
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            background: `${currentTheme.MODAL.TEXT_COLOR}15`,
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '1.2em',
            color: currentTheme.MODAL.TEXT_COLOR,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = `${currentTheme.MODAL.TEXT_COLOR}25`;
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = `${currentTheme.MODAL.TEXT_COLOR}15`;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
        <div
          style={{
            position: 'relative',
            maxHeight: 'calc(80vh - 56px)', // モーダルの上下パディングを考慮
            marginTop: icon ? '40px' : title ? '24px' : '16px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: `${currentTheme.MODAL.TEXT_COLOR}40 transparent`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalWindow;
