import React from 'react';
import Button from '@mui/material/Button';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

const MenuBar = ({ menubarWidth, handleUndo, handleRedo, ZoomInViewBox, ZoomOutViewBox }) => {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: menubarWidth > window.innerWidth ? menubarWidth : '100%', height: '40px', backgroundColor: 'lightgray' }}>
            <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'center', height: '100%' }}>
                <Button variant="contained" onClick={handleUndo}>
                    <UndoIcon />
                    Undo
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="contained" onClick={handleRedo}>
                    <RedoIcon />
                    Redo
                </Button>
                <div style={{ width: '20px' }}></div>
                <Button variant="contained" onClick={ZoomInViewBox}>
                    <ZoomInIcon />
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="contained" onClick={ZoomOutViewBox}>
                    <ZoomOutIcon />
                </Button>
            </div>
        </div>
    );
}

export default MenuBar;