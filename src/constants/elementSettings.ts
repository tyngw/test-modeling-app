// src/constants/elementSettings.ts
export const DEFAULT_ZOOM_RATIO = 0.8;
export const NUMBER_OF_SECTIONS = 3;
export const DEFAULT_POSITION = {
    X: 50,
    Y: 50,
}
export const SIZE = {
    SECTION_HEIGHT: 24,
    WIDTH: {
        MAX: 300,
        MIN: 50,
    },
}
export const OFFSET = {
    X: 100,
    Y: 10,
}
export const ELEM_STYLE = {
    NORMAL: {
        COLOR: "white",
        STROKE_COLOR: "dimgray",
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
export const CONNECTION_PATH_STYLE = {
    COLOR: "black",
    DRAGGING_COLOR: "rgba(0, 0, 255, 0.3)",
    STROKE: 0.5,
}
export const CURVE_CONTROL_OFFSET = 80;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const TEXTAREA_PADDING = {
    HORIZONTAL: 3,
    VERTICAL: 2,
}
export const SHADOW_OFFSET = 3;
export const LINE_HEIGHT_RATIO = 1.4;
export const ICONBAR_HEIGHT = 40;
export const TABBAR_HEIGHT = 40;
export const HEADER_HEIGHT = ICONBAR_HEIGHT + TABBAR_HEIGHT;

// Markerを有効にする場合
export const ARROW = {
    HEIGHT: 24,
    WIDTH: 24,
    OFFSET: 15,
}