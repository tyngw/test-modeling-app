// src/components/ModalWindow.js
import React from 'react';

const ModalWindow = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#fff', padding: '40px 0px 0px 20px', borderRadius: '10px', width: '80%', maxWidth: '500px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
                    <button onClick={onClose} style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', fontSize: '1.5em' }}>×</button>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ModalWindow;