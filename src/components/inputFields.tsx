// src/components/inputFields.tsx
import React, { useRef } from 'react';
import { useCanvas } from '../context/canvasContext';
import { calculateElementWidth } from '../utils/textareaHelpers';
import {
    DEFAULT_FONT_SIZE,
    TEXTAREA_PADDING,
    LINE_HEIGHT_RATIO,
} from '../constants/elementSettings';
import { Element } from '../types';

interface InputFieldsProps {
    element?: Element;
    onEndEditing?: () => void;
}

const InputFields: React.FC<InputFieldsProps> = ({ element, onEndEditing }) => {
    const { dispatch, state } = useCanvas();
    const fieldRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

    if (!element) return null;

    const maxWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
    element.width = maxWidth;

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        index: number
    ) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (index === element.texts.length - 1) {
                dispatch({ type: 'END_EDITING' });
                onEndEditing?.();
            } else {
                const nextIndex = index + 1;
                (fieldRefs.current[nextIndex] as HTMLTextAreaElement)?.focus();
            }
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const cursorPosition = e.currentTarget.selectionStart;
            const newValue = e.currentTarget.value.substring(0, cursorPosition) +
                '\n' +
                e.currentTarget.value.substring(cursorPosition);
            dispatch({
                type: 'UPDATE_TEXT',
                payload: { id: element.id, index, value: newValue }
            });
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            dispatch({ type: 'END_EDITING' });
        }
    };

    return (
        <>
            {element.texts.map((text, index) => {
                let yPosition = 0;
                for (let i = 0; i < index; i++) {
                    yPosition += element.sectionHeights[i];
                }

                return (
                    <textarea
                        key={index}
                        ref={(el) => fieldRefs.current[index] = el}
                        value={text}
                        onChange={(e) => dispatch({
                            type: 'UPDATE_TEXT',
                            payload: {
                                id: element.id,
                                index,
                                value: e.target.value
                            }
                        })}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`editable editable-${index}`}
                        style={{
                            position: 'absolute',
                            left: `${element.x * state.zoomRatio}px`,
                            top: `${(element.y + yPosition) * state.zoomRatio}px`,
                            width: `${(element.width * state.zoomRatio) - 2}px`,
                            height: `${(element.sectionHeights[index] * state.zoomRatio) - 2}px`,
                            margin: '1px 1px',
                            fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                            lineHeight: `${LINE_HEIGHT_RATIO}em`,
                            padding: `0`,
                            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
                            border: 'none',
                            boxSizing: 'border-box',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            resize: 'none',
                        }}
                        autoFocus={index === 0}
                    />
                );
            })}
        </>
    );
};

export default InputFields;
