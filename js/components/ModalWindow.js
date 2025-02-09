"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/components/ModalWindow.js
const react_1 = __importDefault(require("react"));
const ModalWindow = ({ isOpen, onClose, children }) => {
    if (!isOpen) {
        return null;
    }
    return (react_1.default.createElement("div", { style: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' } },
        react_1.default.createElement("div", { style: { backgroundColor: '#fff', padding: '40px 0px 0px 20px', borderRadius: '10px', width: '80%', maxWidth: '500px', overflow: 'hidden', position: 'relative' } },
            react_1.default.createElement("div", { style: { maxHeight: '50vh', overflow: 'auto' } },
                react_1.default.createElement("button", { onClick: onClose, style: { position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', fontSize: '1.5em' } }, "\u00D7"),
                children))));
};
exports.default = ModalWindow;
