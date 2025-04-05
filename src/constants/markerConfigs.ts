// src/constants/markerConfigs.ts
import { MarkerConfigMap } from '../types/types';
import { MARKER, EQUILATERAL_MARKER } from './elementSettings';

/**
 * SVGマーカーの設定を定義
 * それぞれのマーカータイプ（矢印、円、四角形、ダイヤモンド）とその塗りつぶしバージョンの設定
 */
export const MARKER_CONFIGS: MarkerConfigMap = {
  arrow: {
    id: 'arrowhead',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: false,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH} 0, ${MARKER.WIDTH} ${MARKER.HEIGHT}, 0 ${MARKER.HEIGHT / 2}`
  },
  filledArrow: {
    id: 'filledarrowhead',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: true,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH} 0, ${MARKER.WIDTH} ${MARKER.HEIGHT}, 0 ${MARKER.HEIGHT / 2}`
  },
  // 終点用の反転した矢印（通常）
  arrowEnd: {
    id: 'arrowhead-end',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: false,
    shape: 'polygon',
    pointsOrAttributes: `0 0, 0 ${MARKER.HEIGHT}, ${MARKER.WIDTH} ${MARKER.HEIGHT / 2}`
  },
  // 終点用の反転した矢印（塗りつぶし）
  filledArrowEnd: {
    id: 'filledarrowhead-end',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: true,
    shape: 'polygon',
    pointsOrAttributes: `0 0, 0 ${MARKER.HEIGHT}, ${MARKER.WIDTH} ${MARKER.HEIGHT / 2}`
  },
  circle: {
    id: 'circlemarker',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: false,
    shape: 'circle',
    pointsOrAttributes: {
      cx: EQUILATERAL_MARKER.SIZE / 2,
      cy: EQUILATERAL_MARKER.SIZE / 2,
      r: EQUILATERAL_MARKER.SIZE / 2 - 1
    }
  },
  filledCircle: {
    id: 'filledcirclemarker',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: true,
    shape: 'circle',
    pointsOrAttributes: {
      cx: EQUILATERAL_MARKER.SIZE / 2,
      cy: EQUILATERAL_MARKER.SIZE / 2,
      r: EQUILATERAL_MARKER.SIZE / 2 - 1
    }
  },
  // 円形マーカーは対称なので、終点用は同じ
  circleEnd: {
    id: 'circlemarker-end',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: false,
    shape: 'circle',
    pointsOrAttributes: {
      cx: EQUILATERAL_MARKER.SIZE / 2,
      cy: EQUILATERAL_MARKER.SIZE / 2,
      r: EQUILATERAL_MARKER.SIZE / 2 - 1
    }
  },
  filledCircleEnd: {
    id: 'filledcirclemarker-end',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: true,
    shape: 'circle',
    pointsOrAttributes: {
      cx: EQUILATERAL_MARKER.SIZE / 2,
      cy: EQUILATERAL_MARKER.SIZE / 2,
      r: EQUILATERAL_MARKER.SIZE / 2 - 1
    }
  },
  square: {
    id: 'squaremarker',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: false,
    shape: 'rect',
    pointsOrAttributes: {
      x: 1,
      y: 1,
      width: EQUILATERAL_MARKER.SIZE - 2,
      height: EQUILATERAL_MARKER.SIZE - 2
    }
  },
  filledSquare: {
    id: 'filledsquaremarker',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: true,
    shape: 'rect',
    pointsOrAttributes: {
      x: 1,
      y: 1,
      width: EQUILATERAL_MARKER.SIZE - 2,
      height: EQUILATERAL_MARKER.SIZE - 2
    }
  },
  // 四角形マーカーは対称なので、終点用は同じ
  squareEnd: {
    id: 'squaremarker-end',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: false,
    shape: 'rect',
    pointsOrAttributes: {
      x: 1,
      y: 1,
      width: EQUILATERAL_MARKER.SIZE - 2,
      height: EQUILATERAL_MARKER.SIZE - 2
    }
  },
  filledSquareEnd: {
    id: 'filledsquaremarker-end',
    width: EQUILATERAL_MARKER.SIZE,
    height: EQUILATERAL_MARKER.SIZE,
    isFilled: true,
    shape: 'rect',
    pointsOrAttributes: {
      x: 1,
      y: 1,
      width: EQUILATERAL_MARKER.SIZE - 2,
      height: EQUILATERAL_MARKER.SIZE - 2
    }
  },
  diamond: {
    id: 'diamondmarker',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: false,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`
  },
  filledDiamond: {
    id: 'filleddiamondmarker',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: true,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`
  },
  // ダイヤモンドマーカーは対称なので、終点用は同じ
  diamondEnd: {
    id: 'diamondmarker-end',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: false,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`
  },
  filledDiamondEnd: {
    id: 'filleddiamondmarker-end',
    width: MARKER.WIDTH,
    height: MARKER.HEIGHT,
    isFilled: true,
    shape: 'polygon',
    pointsOrAttributes: `${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`
  }
};

/**
 * マーカーIDから対応するマーカー設定を取得する関数
 */
export const getMarkerUrlById = (markerId: string): string | undefined => {
  const config = Object.values(MARKER_CONFIGS).find(config => config.id === markerId);
  return config ? `url(#${config.id})` : undefined;
};

/**
 * マーカータイプから対応するマーカーURLを取得する関数
 */
export const getMarkerUrlByType = (type: string, isEnd: boolean = false): string | undefined => {
  const suffix = isEnd ? '-end' : '';
  
  switch (type) {
    case 'arrow':
      return `url(#arrowhead${suffix})`;
    case 'filled_arrow':
      return `url(#filledarrowhead${suffix})`;
    case 'circle':
      return `url(#circlemarker${suffix})`;
    case 'filled_circle':
      return `url(#filledcirclemarker${suffix})`;
    case 'square':
      return `url(#squaremarker${suffix})`;
    case 'filled_square': 
      return `url(#filledsquaremarker${suffix})`;
    case 'diamond':
      return `url(#diamondmarker${suffix})`;
    case 'filled_diamond':
      return `url(#filleddiamondmarker${suffix})`;
    default:
      return undefined;
  }
};