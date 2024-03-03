import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import SaveIcon from '@mui/icons-material/Save';
import SaveAltIcon from '@mui/icons-material/SaveAlt';


const MenuBar = ({
    menubarWidth,
    handleUndo,
    handleRedo,
    ZoomInViewBox,
    ZoomOutViewBox,
    saveSvg,
    svgElement,
    loadNodes,
    saveNodes,
}) => {
    const fileInput = useRef(null);
    const handleFileOpen = () => {
        fileInput.current.click();
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: menubarWidth > window.innerWidth ? menubarWidth : '100%', height: '40px', backgroundColor: 'lightgray' }}>
            <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'center', height: '100%' }}>
                <input type="file" ref={fileInput} onChange={loadNodes} style={{ display: 'none' }} />
                <Button variant="contained" onClick={handleFileOpen}>
                    <FileOpenIcon />
                    Load
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="contained" onClick={() => saveNodes()}>
                    <SaveIcon />
                    Save
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="contained" onClick={() => saveSvg(svgElement, 'download.svg')}>
                    <SaveAltIcon />
                    Export SVG
                </Button>
                <div style={{ width: '20px' }}></div>
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