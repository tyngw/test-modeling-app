// src/components/inputFields.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useCanvas } from '../context/canvasContext';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import {
    DEFAULT_FONT_SIZE,
    DEFAULT_FONT_FAMILY,
    TEXTAREA_PADDING,
    LINE_HEIGHT_RATIO,
    SIZE,
} from '../constants/elementSettings';
import { Element } from '../types';

interface InputFieldsProps {
    element?: Element;
    onEndEditing?: () => void;
}

const InputFields: React.FC<InputFieldsProps> = ({ element, onEndEditing }) => {
    const { dispatch, state } = useCanvas();
    const fieldRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
    const [localHeights, setLocalHeights] = useState<number[]>([]);
    const measureContext = useRef<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        // キャンバスコンテキストの初期化
        const canvas = document.createElement('canvas');
        measureContext.current = canvas.getContext('2d');
    }, []);

    useEffect(() => {
        if (element) {
            setLocalHeights(element.sectionHeights);
        }
    }, [element]);

    if (!element) return null;

    const calculateDynamicWidth = (text: string) => {
        const minWidth = SIZE.WIDTH.MIN * state.zoomRatio;
        const maxWidth = SIZE.WIDTH.MAX * state.zoomRatio;

        if (measureContext.current) {
            const buffer = 30;
            measureContext.current.font = `${DEFAULT_FONT_SIZE * state.zoomRatio}px ${DEFAULT_FONT_FAMILY}`;
            const textWidth = measureContext.current.measureText(text).width +
                TEXTAREA_PADDING.HORIZONTAL * 2 * state.zoomRatio + buffer;

            return Math.min(maxWidth, Math.max(minWidth, textWidth));
        }
        return minWidth;
    };

    const calculateDynamicHeight = (text: string, width: number) => {
        if (!measureContext.current) return SIZE.SECTION_HEIGHT * state.zoomRatio;

        const lines = wrapText(text, width / state.zoomRatio, state.zoomRatio).length;
        const lineHeight = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * state.zoomRatio;
        const padding = TEXTAREA_PADDING.VERTICAL * state.zoomRatio;

        return Math.max(
            SIZE.SECTION_HEIGHT * state.zoomRatio,
            lines * lineHeight + padding
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
        const newValue = e.target.value;
        const width = calculateDynamicWidth(newValue);
        const height = calculateDynamicHeight(newValue, width);

        // ローカル状態を更新
        setLocalHeights(prev => {
            const newHeights = [...prev];
            newHeights[index] = height / state.zoomRatio;
            return newHeights;
        });

        // テキスト内容のみ親に通知
        dispatch({
            type: 'UPDATE_TEXT',
            payload: {
                id: element.id,
                index,
                value: newValue
            }
        });

        // テキストエリアのサイズ調整
        const textarea = fieldRefs.current[index];
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${height}px`;
        }
    };

    const handleBlur = () => {
        // 編集終了時に親に高さを通知
        dispatch({
            type: 'UPDATE_ELEMENT_SIZE',
            payload: {
                id: element.id,
                width: calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL),
                height: localHeights.reduce((sum, h) => sum + h, 0),
                sectionHeights: localHeights
            }
        });

        onEndEditing?.();
    };

    const handleFocusChange = (index: number) => {
        // 中間的なサイズ更新
        const currentWidth = calculateElementWidth(
            element.texts,
            TEXTAREA_PADDING.HORIZONTAL
        );

        dispatch({
            type: 'UPDATE_ELEMENT_SIZE',
            payload: {
                id: element.id,
                width: currentWidth,
                height: localHeights.reduce((sum, h) => sum + h, 0),
                sectionHeights: localHeights
            }
        });

        // 次のフィールドへフォーカス
        if (index + 1 < element.texts.length) {
            fieldRefs.current[index + 1]?.focus();
        }
    };

    return (
        <>
            {element.texts.map((text, index) => {
                let yPosition = 0;
                for (let i = 0; i < index; i++) {
                    yPosition += localHeights[i] || element.sectionHeights[i];
                }

                const width = calculateDynamicWidth(text);
                const height = calculateDynamicHeight(text, width);

                return (
                    <textarea
                        key={index}
                        ref={(el) => { fieldRefs.current[index] = el }}
                        value={text}
                        onChange={(e) => handleChange(e, index)}
                        onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                handleFocusChange(index);
                            }
                        }}
                        onBlur={handleBlur}
                        style={{
                            position: 'absolute',
                            left: `${element.x * state.zoomRatio}px`,
                            top: `${(element.y + yPosition) * state.zoomRatio}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                            minWidth: `${SIZE.WIDTH.MIN * state.zoomRatio}px`,
                            maxWidth: `${SIZE.WIDTH.MAX * state.zoomRatio}px`,
                            minHeight: `${SIZE.SECTION_HEIGHT * state.zoomRatio}px`,
                            margin: '1px 1px',
                            fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                            lineHeight: `${LINE_HEIGHT_RATIO}em`,
                            padding: `0`,
                            fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
                            boxSizing: 'border-box',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            resize: 'none',
                            zIndex: '0',
                            transition: 'all 0.2s ease-in-out'
                        }}
                        autoFocus={index === 0}
                    />
                );
            })}
        </>
    );
};

export default InputFields;