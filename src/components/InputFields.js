// components/InputFields.js
import React, { useEffect, useRef } from 'react';
import { calculateNodeWidth } from '../util/TextUtilities';

// 入力フィールドを描画する部分
const InputFields = ({ node, updateText, editingField }) => {
    const fields = ['text', 'text2', 'text3'];
    const fieldRefs = {
        text: useRef(null),
        text2: useRef(null),
        text3: useRef(null),
    };

    useEffect(() => {
        const currentFieldRef = fieldRefs[editingField];
        if (currentFieldRef && currentFieldRef.current) {
            currentFieldRef.current.focus(); // 対応するフィールドにフォーカスを設定
        }
    }, [editingField, fieldRefs]);

    if (!node) return null;

    const maxWidth = calculateNodeWidth([node.text, node.text2, node.text3,]);

    return (
        <>
            {fields.map((field, index) => (
                <input
                    key={field}
                    ref={fieldRefs[field]}
                    value={node[field]}
                    onChange={(e) => updateText(e, field)}
                    className={`editable editable-${field}`}
                    style={{
                        position: 'absolute',
                        left: `${node.x}px`,
                        top: `${node.y + index * 20}px`,
                        width: `${maxWidth}px`, // 全フィールドで共通の最大幅を使用
                    }}
                    autoFocus={editingField === field}
                />
            ))}
        </>
    );
};

export default InputFields;