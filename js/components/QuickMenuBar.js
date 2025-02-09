"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/components/QuickMenuBar.js
const react_1 = __importStar(require("react"));
const Button_1 = __importDefault(require("@mui/material/Button"));
const Undo_1 = __importDefault(require("@mui/icons-material/Undo"));
const Redo_1 = __importDefault(require("@mui/icons-material/Redo"));
const ZoomIn_1 = __importDefault(require("@mui/icons-material/ZoomIn"));
const ZoomOut_1 = __importDefault(require("@mui/icons-material/ZoomOut"));
const FolderOpenOutlined_1 = __importDefault(require("@mui/icons-material/FolderOpenOutlined"));
const SaveAsOutlined_1 = __importDefault(require("@mui/icons-material/SaveAsOutlined"));
const SaveAlt_1 = __importDefault(require("@mui/icons-material/SaveAlt"));
const HelpOutlineOutlined_1 = __importDefault(require("@mui/icons-material/HelpOutlineOutlined"));
const InsertDriveFileOutlined_1 = __importDefault(require("@mui/icons-material/InsertDriveFileOutlined"));
const NodeSettings_1 = require("../constants/NodeSettings");
const CanvasContext_1 = require("../context/CanvasContext");
const QuickMenuBar = ({ saveSvg, loadNodes, saveNodes, toggleHelp }) => {
    const { dispatch } = (0, CanvasContext_1.useCanvas)();
    const fileInput = (0, react_1.useRef)(null);
    const handleFileOpen = () => {
        fileInput.current.click();
    };
    const handleAction = (action) => () => {
        dispatch({ type: action });
    };
    return (react_1.default.createElement("div", { style: { position: 'fixed', width: '100%', height: NodeSettings_1.ICONBAR_HEIGHT, zIndex: 10000 } },
        react_1.default.createElement("div", { style: { display: 'flex', justifyContent: 'left', alignItems: 'center', height: '100%', backgroundColor: '#f1f1f1', borderRadius: '30px', padding: '0 20px' } },
            react_1.default.createElement("input", { type: "file", ref: fileInput, onChange: loadNodes, style: { display: 'none' } }),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleAction('NEW') },
                react_1.default.createElement(InsertDriveFileOutlined_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleFileOpen },
                react_1.default.createElement(FolderOpenOutlined_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: saveNodes },
                react_1.default.createElement(SaveAsOutlined_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: saveSvg },
                react_1.default.createElement(SaveAlt_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement("div", { style: { width: '10px' } }),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleAction('UNDO') },
                react_1.default.createElement(Undo_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleAction('REDO') },
                react_1.default.createElement(Redo_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement("div", { style: { width: '10px' } }),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleAction('ZOOM_IN') },
                react_1.default.createElement(ZoomIn_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: handleAction('ZOOM_OUT') },
                react_1.default.createElement(ZoomOut_1.default, { sx: { color: '#666666' } })),
            react_1.default.createElement("div", { style: { width: '10px' } }),
            react_1.default.createElement(Button_1.default, { variant: "text", className: "iconbar-button", onClick: toggleHelp },
                react_1.default.createElement(HelpOutlineOutlined_1.default, { sx: { color: '#666666' } })))));
};
exports.default = QuickMenuBar;
