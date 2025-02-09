"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleArrowNavigation = exports.handleArrowRight = exports.handleArrowLeft = exports.handleArrowDown = exports.handleArrowUp = exports.getSelectedNode = exports.getNodeById = void 0;
const getNodeById = (elements, id) => elements[id];
exports.getNodeById = getNodeById;
const getSelectedNode = (elements) => Object.values(elements).find(element => element.selected);
exports.getSelectedNode = getSelectedNode;
const getSiblings = (elements, elementId) => {
    const element = (0, exports.getNodeById)(elements, elementId);
    return element ? Object.values(elements).filter(n => n.parentId === element.parentId) : [];
};
const getParentSiblings = (elements, elementId) => {
    const element = (0, exports.getNodeById)(elements, elementId);
    const parent = element ? (0, exports.getNodeById)(elements, element.parentId) : null;
    return parent ? Object.values(elements).filter(n => n.parentId === parent.parentId) : [];
};
const handleVerticalMove = (elements, selected, offset) => {
    const siblings = getSiblings(elements, selected.id);
    const index = siblings.findIndex(n => n.id === selected.id);
    const newIndex = index + offset;
    if (newIndex >= 0 && newIndex < siblings.length) {
        return siblings[newIndex].id;
    }
    return handleParentLevelMove(elements, selected, offset);
};
const handleParentLevelMove = (elements, selected, offset) => {
    var _a, _b, _c;
    const parentSiblings = getParentSiblings(elements, selected.id);
    const parent = (0, exports.getNodeById)(elements, selected.parentId);
    const parentIndex = parentSiblings.findIndex(n => n.id === (parent === null || parent === void 0 ? void 0 : parent.id));
    const targetParent = parentSiblings[parentIndex + offset];
    const children = getNodeChildren(elements, targetParent === null || targetParent === void 0 ? void 0 : targetParent.id);
    return offset === -1
        ? (_a = children[children.length - 1]) === null || _a === void 0 ? void 0 : _a.id
        : (_c = (_b = children[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : selected.id;
};
const getNodeChildren = (elements, parentId) => Object.values(elements).filter(element => element.parentId === parentId);
const handleArrowUp = (elements) => (0, exports.handleArrowNavigation)(elements, 'up');
exports.handleArrowUp = handleArrowUp;
const handleArrowDown = (elements) => (0, exports.handleArrowNavigation)(elements, 'down');
exports.handleArrowDown = handleArrowDown;
const handleArrowLeft = (elements) => (0, exports.handleArrowNavigation)(elements, 'left');
exports.handleArrowLeft = handleArrowLeft;
const handleArrowRight = (elements) => (0, exports.handleArrowNavigation)(elements, 'right');
exports.handleArrowRight = handleArrowRight;
const handleArrowNavigation = (elements, direction) => {
    var _a, _b, _c;
    const selected = (0, exports.getSelectedNode)(elements);
    if (!selected)
        return selected === null || selected === void 0 ? void 0 : selected.id;
    switch (direction) {
        case 'up': return handleVerticalMove(elements, selected, -1);
        case 'down': return handleVerticalMove(elements, selected, 1);
        case 'left': return (_a = selected.parentId) !== null && _a !== void 0 ? _a : selected.id;
        case 'right': return (_c = (_b = getNodeChildren(elements, selected.id)[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : selected.id;
        default: return selected.id;
    }
};
exports.handleArrowNavigation = handleArrowNavigation;
