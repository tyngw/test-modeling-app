// src/constants/Node.ts
export const DEFAULT_ZOOM_RATIO = 1;
export const DEFAULT_POSITION = {
    X: 50,
    Y: 100,
}
export const SIZE = {
    NODE_HEIGHT: 72,
    SECTION_HEIGHT: 24,
    WIDTH: {
        MAX: 200,
        MIN: 80,
    },
}
export const OFFSET = {
    X: 100,
    Y: 10,
}
export const ELEM_STYLE = {
    NORMAL: {
        COLOR: "white",
        STROKE_COLOR: "black",
    },
    SELECTED: {
        STROKE_COLOR:  "blue",
    },
    DRAGGING: {
        COLOR: "rgba(100, 100, 255, 0.3)",
        STROKE_COLOR: "rgba(0, 0, 255, 0.3)",
    },
    SHADDOW: {
        COLOR: 'rgba(0, 0, 0, 0.5)'
    },
    RX: 2,
    STROKE: "2px",
}
export const CURVE_CONTROL_OFFSET = 80;
export const DEFAULT_FONT_SIZE = 12;
export const SHADOW_OFFSET = 3;
export const MULTIBYTE_CHAR_COEFFICIENT = 1;
export const SINGLEBYTE_CHAR_COEFFICIENT = 0.5;
export const MULTIBYTE_CHAR_WIDTH = 14;
export const SINGLEBYTE_CHAR_WIDTH = 7;
export const LINE_HEIGHT_RATIO = 1.4;
export const ICONBAR_HEIGHT = 40;