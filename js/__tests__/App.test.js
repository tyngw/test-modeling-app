"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const App_1 = __importDefault(require("../App"));
test('view-areaが表示されていることを確認', () => {
    (0, react_1.render)(React.createElement(App_1.default, null));
    const viewArea = react_1.screen.getByTestId('view-area');
    expect(viewArea).toBeInTheDocument();
});
