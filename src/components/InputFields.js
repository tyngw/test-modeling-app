import React, { useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { DEFAULT_SECTION_HEIGHT, DEFAULT_FONT_SIZE, LINE_HEIGHT_RATIO } from '../constants/NodeSettings';

const InputFields = ({ element }) => {
    const { dispatch } = useCanvas();
    const { state } = useCanvas();
    const fields = ['text', 'text2', 'text3'];
    const fieldRefs = useRef({
        text: null,
        text2: null,
        text3: null
    });

    if (!element) return null;

    console.log('[InputFields] Current zoomRatio:', state.zoomRatio);

    const sectionHeights = [
        element.section1Height,
        element.section2Height,
        element.section3Height
    ];

    const maxWidth = calculateNodeWidth(
        [element.text, element.text2, element.text3],
        state.zoomRatio
    );
    element.width = maxWidth;

    const handleKeyDown = (e, field, index) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (index === fields.length - 1) {
                dispatch({ type: 'END_EDITING' });
            } else {
                const nextIndex = index + 1;
                const nextField = fields[nextIndex];

                if (fieldRefs.current[nextField]) {
                    fieldRefs.current[nextField].focus();
                }
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const cursorPosition = e.target.selectionStart;
            const newValue = e.target.value.substring(0, cursorPosition) + '\n' + e.target.value.substring(cursorPosition);
            dispatch({ type: 'UPDATE_TEXT', payload: { id: element.id, field, value: newValue } });
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            dispatch({ type: 'END_EDITING' });
        }
    };

    return (
        <>
            {fields.map((field, index) => {
                let height;
                switch (field) {
                    case 'text':
                        console.log(`[InputFields.js] text: ${element.text} height: ${element.section1Height}`);
                        height = element.section1Height;
                        break;
                    case 'text2':
                        height = element.section2Height;
                        break;
                    case 'text3':
                        height = element.section3Height;
                        break;
                    default:
                        height = DEFAULT_SECTION_HEIGHT;
                }

                let yPosition = 0;
                for (let i = 0; i < index; i++) {
                    // それぞれのsectionHeightの値を使用
                    yPosition += element[`section${i + 1}Height`];
                }

                return (
                    <textarea
                        key={field}
                        ref={(el) => fieldRefs.current[field] = el}
                        value={element[field]}
                        onChange={(e) => dispatch({
                            type: 'UPDATE_TEXT',
                            payload: {
                                id: element.id,
                                field,
                                value: e.target.value
                            }
                        })}
                        onKeyDown={(e) => handleKeyDown(e, field, index)}
                        className={`editable editable-${field}`}
                        style={{
                            position: 'absolute',
                            left: `${element.x * state.zoomRatio}px`,
                            top: `${(element.y + yPosition) * state.zoomRatio}px`,
                            width: `${element.width * state.zoomRatio}px`,
                            height: `${sectionHeights[index] * state.zoomRatio}px`,
                            padding: '2px 3px',
                            fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                            lineHeight: `${LINE_HEIGHT_RATIO}em`,
                            fontFamily: `
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            Roboto,
                            "Helvetica Neue",
                            Arial,
                            sans-serif
                            `,
                            border: 'none', // border を無効化
                            boxSizing: 'border-box', // box-sizing を統一
                            fontSmoothing: 'antialiased', // フォントのアンチエイリアス
                            WebkitFontSmoothing: 'antialiased', // Safari 用
                            MozOsxFontSmoothing: 'grayscale', // Firefox 用
                            overflow: 'hidden', // スクロールバーを非表示にする
                            whiteSpace: 'pre-wrap',
                             wordWrap: 'break-word',
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