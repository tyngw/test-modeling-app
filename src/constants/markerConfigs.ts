// src/constants/markerConfigs.ts
import { MarkerConfigMap } from '../types';
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
export const getMarkerUrlByType = (type: string): string | undefined => {
  switch (type) {
    case 'arrow':
      return 'url(#arrowhead)';
    case 'filled_arrow':
      return 'url(#filledarrowhead)';
    case 'circle':
      return 'url(#circlemarker)';
    case 'filled_circle':
      return 'url(#filledcirclemarker)';
    case 'square':
      return 'url(#squaremarker)';
    case 'filled_square': 
      return 'url(#filledsquaremarker)';
    case 'diamond':
      return 'url(#diamondmarker)';
    case 'filled_diamond':
      return 'url(#filleddiamondmarker)';
    default:
      return undefined;
  }
};