"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/components/FoldingIcon.js
const react_1 = __importDefault(require("react"));
const FoldingIcon = ({ element }) => {
    return (react_1.default.createElement("g", null,
        react_1.default.createElement("circle", { cx: element.x + element.width + 5, cy: element.y + element.height / 2, r: 4, fill: "none", stroke: "black", strokeWidth: "1" }),
        react_1.default.createElement("text", { x: element.x + element.width + 5, y: element.y + element.height / 2, textAnchor: "middle" // テキストを中央揃えにする
            , dominantBaseline: "middle" // テキストを中央揃えにする
            , fontSize: "12" // フォントサイズ
         }, "+")));
};
exports.default = FoldingIcon;
