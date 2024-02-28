// components/InputFields.js
import React, { useEffect, useRef } from 'react';
import { calculateNodeWidth } from '../utils/TextUtilities';

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
        // Enterキーが押された場合、編集モードを終了
        if (e.key === 'Enter') {
            e.preventDefault();
            endEditing();
            
        }
    };

    return (
        <>
            {fields.map((field, index) => (
                <input
                    key={field}
                    ref={fieldRefs[field]}
                    value={node[field]}
                    onChange={(e) => updateText(e, field)}
                    onKeyDown={(e) => handleKeyDown(e, field, index)}
                    className={`editable editable-${field}`}
                    style={{
                        position: 'absolute',
                        left: `${node.x}px`,
                        top: `${node.y + index * 20}px`,
                        width: `${maxWidth}px`, // 全フィールドで共通の最大幅を使用
                    }}
                    autoFocus={field === 'text'}
                />
            ))}
        </>
    );
};

export default InputFields;