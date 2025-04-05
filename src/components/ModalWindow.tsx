// src/components/modalWindow.tsx
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { getCurrentTheme } from '../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/localStorageHelpers';
import { useCanvas } from '../context/CanvasContext';
import { useIsMounted } from '../hooks/UseIsMounted';

interface ModalWindowProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    closeOnOverlayClick?: boolean; // 追加：領域外クリックでの閉じるを制御
}

const ModalWindow: React.FC<ModalWindowProps> = ({ 
    isOpen, 
    onClose, 
    children,
    closeOnOverlayClick = true // デフォルトでは領域外クリックで閉じる（既存の動作を維持）
}) => {
    const isMounted = useIsMounted();
    const [currentTheme, setCurrentTheme] = useState(() => 
        getCurrentTheme(getCanvasBackgroundColor())
    );
    const { dispatch } = useCanvas();
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!isMounted) return;
        const backgroundColor = getCanvasBackgroundColor();
        setCurrentTheme(getCurrentTheme(backgroundColor));
    }, [isMounted]);

    useEffect(() => {
        if (isOpen) {
            dispatch({ type: 'END_EDITING' });
            setIsAnimating(true);
        }
    }, [isOpen, dispatch]);

    const handleClose = () => {
        setIsAnimating(false);
        // Delay actual closing to allow for animation
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
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
            onClick={handleOverlayClick}
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
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-in-out',
                    opacity: isAnimating ? 1 : 0,
                }}
                onClick={(e) => e.stopPropagation()}
            >
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
                        marginTop: '32px', // closeボタン分の余白
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
