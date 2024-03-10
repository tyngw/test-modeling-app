import React, { useRef } from 'react';
import Button from '@mui/material/Button';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SaveAsOutlinedIcon from '@mui/icons-material/SaveAsOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { ICONBAR_HEIGHT } from '../constants/Node';


const IconBar = ({
    handleNewFile,
    handleUndo,
    handleRedo,
    ZoomInViewBox,
    ZoomOutViewBox,
    saveSvg,
    loadNodes,
    saveNodes,
}) => {
    const fileInput = useRef(null);
    const handleFileOpen = () => {
        fileInput.current.click();
    };

    return (
        // フォーカスを無効にするためにdiv:focus outline: noneを設定
        <div style={{ position: 'fixed', width: '100%', height: ICONBAR_HEIGHT, zIndex: 100, }}>
            <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'center', height: '100%', backgroundColor: '#f1f1f1', borderRadius: '30px', padding: '0 20px', }}>
                <input type="file" ref={fileInput} onChange={loadNodes} style={{ display: 'none' }} />
                <Button variant="text" className="iconbar-button" onClick={handleNewFile}>
                    <InsertDriveFileOutlinedIcon sx={{ color: '#666666' }} />
                </Button>
                <Button variant="text" className="iconbar-button" onClick={handleFileOpen} >
                    <FolderOpenOutlinedIcon sx={{ color: '#666666' }} />
                </Button>
                <Button variant="text" className="iconbar-button" onClick={() => saveNodes()} >
                    <SaveAsOutlinedIcon sx={{ color: '#666666' }} />
                </Button>
                <Button variant="text" className="iconbar-button" onClick={() => saveSvg()} >
                    <SaveAltIcon sx={{ color: '#666666' }} />
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="text" className="iconbar-button" onClick={handleUndo} >
                    <UndoIcon sx={{ color: '#666666' }} />
                </Button>
                <Button variant="text" className="iconbar-button" onClick={handleRedo} >
                    <RedoIcon sx={{ color: '#666666' }} />
                </Button>
                <div style={{ width: '10px' }}></div>
                <Button variant="text" className="iconbar-button" onClick={ZoomInViewBox} >
                    <ZoomInIcon sx={{ color: '#666666' }} />
                </Button>
                <Button variant="text" className="iconbar-button" onClick={ZoomOutViewBox} >
                    <ZoomOutIcon sx={{ color: '#666666' }} />
                </Button>
            </div>
        </div>
    );
}

export default IconBar;