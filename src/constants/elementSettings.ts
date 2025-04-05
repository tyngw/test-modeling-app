// src/constants/elementSettings.ts
import { ElementDirection, LayoutMode, MarkerType } from '../types/types';

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
        COLOR: "#ffffff",
        STROKE_COLOR: "#696969",
    },
    SELECTED: {
        STROKE_COLOR: "#0000ff",
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
    STROKE_WIDTH: 2,
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

export const MARKER = {
    HEIGHT: 12,
    WIDTH: 14,
    OFFSET: 14,
};

export const EQUILATERAL_MARKER = {
    SIZE: 10,
    OFFSET: 10,
};

export const MARKER_TYPES: Record<string, MarkerType> = {
    NONE: 'none',
    ARROW: 'arrow',
    CIRCLE: 'circle',
    SQUARE: 'square',
    DIAMOND: 'diamond',
    FILLED_ARROW: 'filled_arrow',
    FILLED_CIRCLE: 'filled_circle',
    FILLED_SQUARE: 'filled_square',
    FILLED_DIAMOND: 'filled_diamond',
};

export const DEFAULT_MARKER_TYPE = MARKER_TYPES.NONE;

export const LAYOUT_MODES: Record<string, LayoutMode> = {
    DEFAULT: 'default',
    MIND_MAP: 'mindmap',
};

// LayoutMode型で定義
export const DEFAULT_LAYOUT_MODE = LAYOUT_MODES.DEFAULT;

export const ELEMENT_DIRECTIONS: Record<string, ElementDirection> = {
    RIGHT: 'right',
    LEFT: 'left',
    NONE: 'none',
};

export const DEFAULT_ELEMENT_DIRECTION = ELEMENT_DIRECTIONS.LEFT;

export const DEFAULT_CONNECTION_PATH_COLOR = 'black';
export const DEFAULT_CONNECTION_PATH_STROKE = 0.5;
export const DEFAULT_CANVAS_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_TEXT_COLOR = '#000000';