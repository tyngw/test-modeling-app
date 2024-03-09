import React from 'react';

const FoldingIcon = ({ node }) => {
    return (
        <g>
            <circle
                cx={node.x + node.width + 5} // 親ノードのRectの右端に配置
                cy={node.y + node.height / 2} // 親ノードのRectの中央に配置
                r={4} // 円の半径
                fill="none"
                stroke="black"
                strokeWidth="1"
            />
            <text
                x={node.x + node.width + 5} // 親ノードのRectの右端に配置
                y={node.y + node.height / 2} // 親ノードのRectの中央に配置
                textAnchor="middle" // テキストを中央揃えにする
                dominantBaseline="middle" // テキストを中央揃えにする
                fontSize="12" // フォントサイズ
            >
                +
            </text>
        </g>
    );
};

export default FoldingIcon;