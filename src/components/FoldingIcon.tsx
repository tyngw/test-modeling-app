// src/components/FoldingIcon.tsx
import React from 'react';
import { Element } from '../types';
import {
    DEFAULT_FONT_SIZE,
  } from '../constants/ElementSettings';

interface FoldingIconProps {
    element: Element;
}

const FoldingIcon: React.FC<FoldingIconProps> = ({ element }) => {
    return (
        <g>
            <circle
                cx={element.x + element.width + 5} // 親ノードのRectの右端に配置
                cy={element.y + element.height / 2} // 親ノードのRectの中央に配置
                r={4} // 円の半径
                fill="none"
                stroke="black"
                strokeWidth="1"
            />
            <text
                x={element.x + element.width + 5} // 親ノードのRectの右端に配置
                y={element.y + element.height / 2} // 親ノードのRectの中央に配置
                textAnchor="middle" // テキストを中央揃えにする
                dominantBaseline="middle" // テキストを中央揃えにする
                fontSize={DEFAULT_FONT_SIZE} // フォントサイズ
            >
                +
            </text>
        </g>
    );
};

export default FoldingIcon;