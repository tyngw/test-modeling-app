// src/components/modalWindow.tsx
import React, { ReactNode } from 'react';

interface ModalWindowProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

const ModalWindow: React.FC<ModalWindowProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000000 }}>
            <div style={{ backgroundColor: '#fff', padding: '40px 24px 24px', borderRadius: '10px', width: '80%', maxWidth: '500px', overflow: 'hidden', position: 'relative', zIndex: 1000001 }}>
                <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
                    <button onClick={onClose} style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', fontSize: '1.5em' }}>×</button>
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        paddingRight: '8px' // スクロールバー対策
                    }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalWindow;