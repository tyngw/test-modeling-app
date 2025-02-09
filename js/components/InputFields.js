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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const CanvasContext_1 = require("../context/CanvasContext");
const TextNodeHelpers_1 = require("../utils/TextNodeHelpers");
const NodeSettings_1 = require("../constants/NodeSettings");
const InputFields = ({ element }) => {
    const { dispatch } = (0, CanvasContext_1.useCanvas)();
    const { state } = (0, CanvasContext_1.useCanvas)();
    const fields = ['text', 'text2', 'text3'];
    const fieldRefs = (0, react_1.useRef)({
        text: null,
        text2: null,
        text3: null
    });
    if (!element)
        return null;
    const sectionHeights = [
        element.section1Height,
        element.section2Height,
        element.section3Height
    ];
    const maxWidth = (0, TextNodeHelpers_1.calculateNodeWidth)([element.text, element.text2, element.text3], state.zoomRatio);
    element.width = maxWidth;
    const handleKeyDown = (e, field, index) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (index === fields.length - 1) {
                dispatch({ type: 'END_EDITING' });
            }
            else {
                const nextIndex = index + 1;
                const nextField = fields[nextIndex];
                if (fieldRefs.current[nextField]) {
                    fieldRefs.current[nextField].focus();
                }
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const cursorPosition = e.target.selectionStart;
            const newValue = e.target.value.substring(0, cursorPosition) + '\n' + e.target.value.substring(cursorPosition);
            dispatch({ type: 'UPDATE_TEXT', payload: { id: element.id, field, value: newValue } });
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            dispatch({ type: 'END_EDITING' });
        }
    };
    return (react_1.default.createElement(react_1.default.Fragment, null, fields.map((field, index) => {
        let height;
        switch (field) {
            case 'text':
                console.log(`[InputFields.js] text: ${element.text} height: ${element.section1Height}`);
                height = element.section1Height;
                break;
            case 'text2':
                height = element.section2Height;
                break;
            case 'text3':
                height = element.section3Height;
                break;
            default:
                height = NodeSettings_1.DEFAULT_SECTION_HEIGHT;
        }
        let yPosition = 0;
        for (let i = 0; i < index; i++) {
            // それぞれのsectionHeightの値を使用
            yPosition += element[`section${i + 1}Height`];
        }
        return (react_1.default.createElement("textarea", { key: field, ref: (el) => fieldRefs.current[field] = el, value: element[field], onChange: (e) => dispatch({
                type: 'UPDATE_TEXT',
                payload: {
                    id: element.id,
                    field,
                    value: e.target.value
                }
            }), onKeyDown: (e) => handleKeyDown(e, field, index), className: `editable editable-${field}`, style: {
                position: 'absolute',
                left: `${element.x * state.zoomRatio}px`,
                top: `${(element.y + yPosition) * state.zoomRatio}px`,
                width: `${element.width * state.zoomRatio}px`,
                height: `${sectionHeights[index] * state.zoomRatio}px`,
                padding: '2px 3px',
                fontSize: `${NodeSettings_1.DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                lineHeight: `${NodeSettings_1.LINE_HEIGHT_RATIO}em`,
                fontFamily: `
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            Roboto,
                            "Helvetica Neue",
                            Arial,
                            sans-serif
                            `,
                border: 'none',
                boxSizing: 'border-box',
                fontSmoothing: 'antialiased',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                resize: 'none',
            }, autoFocus: field === 'text' }));
    })));
};
exports.default = InputFields;
