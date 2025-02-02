// components/InputFields.js
import React, { useRef } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';

// 入力フィールドを描画する部分
const InputFields = ({ node, updateText, endEditing, zoomRatio }) => {
    const fields = ['text', 'text2', 'text3'];
    const fieldRefs = {
        text: useRef(null),
        text2: useRef(null),
        text3: useRef(null),
    };

    if (!node) return null;

    const maxWidth = calculateNodeWidth([node.text, node.text2, node.text3]);
    node.width = maxWidth;

    const handleKeyDown = (e, field, index) => {
        // タブキーが押された場合、次のフィールドにフォーカスを移動
        // ただし、最後のフィールドの場合は編集モードを終了
        if (e.key === 'Tab') {
            e.preventDefault();
            const nextIndex = (index + 1) % fields.length;
            const nextField = fields[nextIndex];

            if (nextField !== 'text') {
                fieldRefs[nextField].current.focus();
            } else {
                endEditing();
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const cursorPosition = e.target.selectionStart;
            // カーソルの位置に改行を挿入
            const newValue = e.target.value.substring(0, cursorPosition) + '\n' + e.target.value.substring(cursorPosition);
            updateText(newValue, field);
        }
        // Escキーが押された場合、編集モードを終了
        if (e.key === 'Escape') {
            e.preventDefault();
            endEditing();

        }
    };

    return (
        <>
            {fields.map((field, index) => {
                let height;
                switch (field) {
                    case 'text':
                        console.log(`[InputFields.js] text: ${node.text} height: ${node.section1Height}`);
                        height = node.section1Height;
                        break;
                    case 'text2':
                        height = node.section2Height;
                        break;
                    case 'text3':
                        height = node.section3Height;
                        break;
                    default:
                        height = 20; // デフォルトの高さ
                }

                let y = node.y;
                for (let i = 0; i < index; i++) {
                    // それぞれのsectionHeightの値を使用
                    y += node[`section${i + 1}Height`];
                }

                return (
                    <textarea
                        key={field}
                        ref={fieldRefs[field]}
                        value={node[field]}
                        onChange={(e) => updateText(e.target.value, field)}
                        onKeyDown={(e) => handleKeyDown(e, field, index)}
                        className={`editable editable-${field}`}
                        style={{
                            position: 'absolute',
                            left: `${node.x * zoomRatio}px`,
                            top: `${y * zoomRatio}px`, // 計算したY座標を設定
                            width: `${maxWidth * zoomRatio}px`, // 全フィールドで共通の最大幅を使用
                            height: `${height * zoomRatio}px`, // 計算した高さを設定
                            fontSize: `${12 * zoomRatio}px`,
                            resize: 'none',
                        }}
                        autoFocus={field === 'text'}
                    />
                );
            })}

        </>
    );
};

export default InputFields;