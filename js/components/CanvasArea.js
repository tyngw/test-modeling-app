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
const react_1 = __importStar(require("react"));
const CanvasContext_1 = require("../context/CanvasContext");
const IdeaElement_1 = __importDefault(require("./IdeaElement"));
const Marker_1 = require("./Marker");
const QuickMenuBar_1 = __importDefault(require("./QuickMenuBar"));
const InputFields_1 = __importDefault(require("./InputFields"));
const useResizeEffect_1 = __importDefault(require("../hooks/useResizeEffect"));
const useClickOutside_1 = require("../hooks/useClickOutside");
const useNodeDragEffect_1 = require("../hooks/useNodeDragEffect");
const undoredo_1 = require("../state/undoredo");
const FileHelpers_1 = require("../utils/FileHelpers");
const FoldingIcon_1 = __importDefault(require("./FoldingIcon"));
const ModalWindow_1 = __importDefault(require("./ModalWindow"));
const HelpContent_1 = require("../constants/HelpContent");
const NodeSettings_1 = require("../constants/NodeSettings");
const CanvasArea = () => {
    const svgRef = (0, react_1.useRef)();
    const { state, dispatch } = (0, CanvasContext_1.useCanvas)();
    const [displayScopeSize, setCanvasSize] = (0, react_1.useState)({ width: window.innerWidth, height: window.innerHeight });
    const [displayArea, setDisplayArea] = (0, react_1.useState)(`0 0 ${displayScopeSize.width} ${displayScopeSize.height - NodeSettings_1.ICONBAR_HEIGHT}`);
    const [isHelpOpen, setHelpOpen] = (0, react_1.useState)(false);
    const toggleHelp = () => setHelpOpen(!isHelpOpen);
    const editingNode = Object.values(state.elements).find(element => element.editing);
    (0, react_1.useEffect)(() => {
        const elementList = (0, undoredo_1.loadFromLocalStorage)();
        if (elementList)
            dispatch({ type: 'LOAD_NODES', payload: elementList });
    }, [dispatch]);
    (0, useResizeEffect_1.default)({ setCanvasSize, setDisplayArea, state });
    (0, useClickOutside_1.useClickOutside)(svgRef, editingNode);
    const { handleMouseDown, handleMouseUp, overDropTarget } = (0, useNodeDragEffect_1.useNodeDragEffect)();
    const handleKeyDown = (e) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const keyActionMap = {
            'Ctrl+z': 'UNDO',
            'Ctrl+Shift+z': 'REDO',
            'ArrowUp': 'ARROW_UP',
            'ArrowDown': 'ARROW_DOWN',
            'ArrowRight': 'ARROW_RIGHT',
            'Ctrl+ArrowRight': 'EXPAND_NODE',
            'ArrowLeft': 'ARROW_LEFT',
            'Ctrl+ArrowLeft': 'COLLAPSE_NODE',
            'Ctrl+x': 'CUT_NODE',
            'Ctrl+c': 'COPY_NODE',
            'Ctrl+v': 'PASTE_NODE',
            'Tab': 'ADD_NODE',
            'Delete': 'DELETE_NODE',
            'Backspace': 'DELETE_NODE',
            'Enter': 'EDIT_NODE'
        };
        if (keyActionMap[keyCombo])
            dispatch({ type: keyActionMap[keyCombo] });
    };
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(QuickMenuBar_1.default, { saveSvg: () => (0, FileHelpers_1.saveSvg)(svgRef.current, 'download.svg'), loadNodes: (event) => (0, FileHelpers_1.loadNodes)(event).then(elements => dispatch({ type: 'LOAD_NODES', payload: elements })).catch(alert), saveNodes: () => (0, FileHelpers_1.saveNodes)(Object.values(state.elements)), toggleHelp: toggleHelp }),
        react_1.default.createElement("div", { style: { position: 'absolute', top: NodeSettings_1.ICONBAR_HEIGHT, left: 0, overflow: 'auto' } },
            react_1.default.createElement(ModalWindow_1.default, { isOpen: isHelpOpen, onClose: toggleHelp },
                react_1.default.createElement("div", { dangerouslySetInnerHTML: { __html: HelpContent_1.helpContent } })),
            react_1.default.createElement("svg", { "data-testid": "view-area", ref: svgRef, width: displayScopeSize.width, height: displayScopeSize.height, viewBox: displayArea, tabIndex: "0", onKeyDown: handleKeyDown, style: { outline: 'none' }, className: "svg-element" },
                react_1.default.createElement(Marker_1.Marker, null),
                Object.values(state.elements)
                    .filter(element => element.visible)
                    .map(element => {
                    const hasHiddenChildren = Object.values(state.elements)
                        .some(n => n.parentId === element.id && !n.visible);
                    return (react_1.default.createElement(react_1.default.Fragment, { key: element.id },
                        react_1.default.createElement(IdeaElement_1.default, { element: element, overDropTarget: overDropTarget, handleMouseDown: handleMouseDown, handleMouseUp: handleMouseUp }),
                        hasHiddenChildren && react_1.default.createElement(FoldingIcon_1.default, { element: element })));
                })),
            react_1.default.createElement(InputFields_1.default, { element: editingNode }))));
};
exports.default = react_1.default.memo(CanvasArea);
