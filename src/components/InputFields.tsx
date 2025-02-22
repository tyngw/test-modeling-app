// src/components/InputFields.tsx
import React, { useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { calculateElementWidth } from '../utils/TextareaHelpers';
import {
    DEFAULT_FONT_SIZE,
    TEXTAREA_PADDING,
    LINE_HEIGHT_RATIO,
} from '../constants/ElementSettings';
import { Element } from '../types';

interface InputFieldsProps {
    element?: Element;
    onEndEditing?: () => void;
}

type TextField = 'text' | 'text2' | 'text3';

const InputFields: React.FC<InputFieldsProps> = ({ element, onEndEditing }) => {
    const { dispatch, state } = useCanvas();
    const fieldRefs = useRef<{
        text: HTMLTextAreaElement | null;
        text2: HTMLTextAreaElement | null;
        text3: HTMLTextAreaElement | null;
    }>({ text: null, text2: null, text3: null });

    if (!element) return null;

    const getSectionHeight = (index: number): number => {
        const sectionKey = `section${index + 1}Height` as keyof Element;
        return (element[sectionKey] as number);
    };

    const sectionHeights = [
        getSectionHeight(0),
        getSectionHeight(1),
        getSectionHeight(2)
    ];

    const maxWidth = calculateElementWidth(
        [element.text, element.text2, element.text3],
        TEXTAREA_PADDING.HORIZONTAL,
    );
    element.width = maxWidth;

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        field: TextField,
        index: number
    ) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (index === 2) {
                dispatch({ type: 'END_EDITING' });
                onEndEditing?.();
            } else {
                const nextIndex = index + 1;
                const fields: TextField[] = ['text', 'text2', 'text3'];
                const nextField = fields[nextIndex];
                (fieldRefs.current[nextField] as HTMLTextAreaElement)?.focus();
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
                payload: { id: element.id, field, value: newValue }
            });
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            dispatch({ type: 'END_EDITING' });
        }
    };

    return (
        <>
            {(['text', 'text2', 'text3'] as TextField[]).map((field, index) => {
                let yPosition = 0;
                for (let i = 0; i < index; i++) {
                    yPosition += getSectionHeight(i);
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
                            width: `${(element.width * state.zoomRatio) - 2}px`,
                            height: `${(sectionHeights[index] * state.zoomRatio) - 2}px`,
                            // padding: '2px 3px',
                            margin: '1px 1px',
                            fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                            lineHeight: `${LINE_HEIGHT_RATIO}em`,
                            padding: `0`,
                            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
                            border: 'none',
                            boxSizing: 'border-box',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
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