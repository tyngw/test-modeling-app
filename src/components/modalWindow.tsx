// src/components/modalWindow.tsx
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { getCurrentTheme } from '../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/localStorageHelpers';

interface ModalWindowProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

const ModalWindow: React.FC<ModalWindowProps> = ({ isOpen, onClose, children }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(() => 
        getCurrentTheme(getCanvasBackgroundColor())
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const backgroundColor = getCanvasBackgroundColor();
        setCurrentTheme(getCurrentTheme(backgroundColor));
    }, [isMounted]);

    if (!isOpen || !isMounted) {
        return null;
    }

    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9000 
        }}>
            <div style={{ 
                backgroundColor: currentTheme.MODAL.BACKGROUND,
                color: currentTheme.MODAL.TEXT_COLOR,
                padding: '40px 24px 24px', 
                borderRadius: '10px', 
                width: '80%', 
                maxWidth: '500px', 
                overflow: 'hidden', 
                position: 'relative',
                zIndex: 9001
            }}>
                <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            position: 'absolute', 
                            right: 10, 
                            top: 10, 
                            background: 'transparent', 
                            border: 'none', 
                            fontSize: '1.5em',
                            color: currentTheme.MODAL.TEXT_COLOR,
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        paddingRight: '8px'
                    }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalWindow;