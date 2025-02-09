"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/App.js
const react_1 = __importDefault(require("react"));
const CanvasArea_1 = __importDefault(require("./components/CanvasArea"));
require("./App.css");
const DeviceChecker_1 = require("./utils/DeviceChecker");
const CanvasContext_1 = require("./context/CanvasContext");
function App() {
    return (react_1.default.createElement("div", { className: "App" },
        (0, DeviceChecker_1.isMobileDevice)() && (react_1.default.createElement("div", { style: { backgroundColor: '#006666', color: 'white', textAlign: 'center' } }, "\u3053\u306E\u30A2\u30D7\u30EA\u306F\u30E2\u30D0\u30A4\u30EB\u30C7\u30D0\u30A4\u30B9\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093\u3002")),
        react_1.default.createElement(CanvasContext_1.CanvasProvider, null,
            react_1.default.createElement(CanvasArea_1.default, null))));
}
exports.default = App;
