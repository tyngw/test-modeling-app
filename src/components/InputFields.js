// components/InputFields.js
import React, { useState, useEffect, useRef } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';

// 入力フィールドを描画する部分
const InputFields = ({ node, updateText, endEditing }) => {
    const fields = ['text', 'text2', 'text3'];
    const fieldRefs = {
        text: useRef(null),
        text2: useRef(null),
        text3: useRef(null),
    };

    if (!node) return null;

    const maxWidth = calculateNodeWidth([node.text, node.text2, node.text3]);

    const handleKeyDown = (e, field, index) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const nextIndex = (index + 1) % fields.length;
            const nextField = fields[nextIndex];
            fieldRefs[nextField].current.focus();
        }

        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const cursorPosition = e.target.selectionStart;
            // カーソルの位置に改行を挿入
            const newValue = e.target.value.substring(0, cursorPosition) + '\n' + e.target.value.substring(cursorPosition);
            updateText(newValue, field);
        } else if (e.key === 'Enter') {
            // Enterキーが押された場合、編集モードを終了
            e.preventDefault();
            endEditing();
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
                // 各テキストの行数を計算
                const lines = node[field].split('\n').length;
                // テキストエリアの高さを計算
                const height = 20 * lines;

                // テキストエリアのY座標を計算
                let y = node.y;
                for (let i = 0; i < index; i++) {
                    const prevLines = node[fields[i]].split('\n').length;
                    y += 20 * prevLines;
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
                            left: `${node.x}px`,
                            top: `${y}px`, // 計算したY座標を設定
                            width: `${maxWidth}px`, // 全フィールドで共通の最大幅を使用
                            height: `${height}px`, // 計算した高さを設定
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