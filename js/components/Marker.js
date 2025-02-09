"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Marker = void 0;
// src/components/Marker.js
const react_1 = __importDefault(require("react"));
function Marker() {
    return (react_1.default.createElement("marker", { id: "arrowhead", markerWidth: "10", markerHeight: "7", refX: "0", refY: "3.5", orient: "auto", fill: "none", stroke: "black" },
        react_1.default.createElement("polygon", { points: "0 0, 10 3.5, 0 7", fill: "none", stroke: "black" })));
}
exports.Marker = Marker;
