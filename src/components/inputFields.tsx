'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/canvasContext';
import { wrapText } from '../utils/textareaHelpers';
import { useIsMounted } from '../hooks/useIsMounted';
import {
    DEFAULT_FONT_SIZE,
    TEXTAREA_PADDING,
    LINE_HEIGHT_RATIO,
    SIZE,
} from '../constants/elementSettings';
import { 
    getFontFamily, 
    getElementColor,
    getTextColor 
} from '../utils/localStorageHelpers';
import { Element } from '../types';

interface InputFieldsProps {
    element?: Element;
    onEndEditing?: () => void;
}

const InputFields: React.FC<InputFieldsProps> = ({ element, onEndEditing }) => {
    const { dispatch, state } = useCanvas();
    const isMounted = useIsMounted();
    const fieldRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
    const [localHeights, setLocalHeights] = useState<number[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const measureContext = useRef<CanvasRenderingContext2D | null>(null);
    const prevElementId = useRef<string | undefined>(undefined);
    const [fontFamily, setFontFamily] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('');
    const [textColor, setTextColor] = useState('');

    useEffect(() => {
        if (!isMounted) return;
        const canvas = document.createElement('canvas');
        measureContext.current = canvas.getContext('2d');
        
        setFontFamily(getFontFamily());
        setBackgroundColor(getElementColor());
        setTextColor(getTextColor());
    }, [isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        
        if (element?.id !== prevElementId.current) {
            const initialHeights = element?.sectionHeights || [];
            setLocalHeights(initialHeights);
            setActiveIndex(0);
            prevElementId.current = element?.id;
            
            // テキストエリアにフォーカスし、カーソルを文字列の末尾に配置する
            setTimeout(() => {
                const textarea = fieldRefs.current[0];
                if (textarea) {
                    textarea.focus({ preventScroll: true });
                    // カーソルを文字列の末尾に配置
                    const textLength = element?.texts[0]?.length || 0;
                    textarea.setSelectionRange(textLength, textLength);
                }
            }, 50);
        }
    }, [element, isMounted]);

    const calculateDynamicHeight = useCallback((text: string) => {
        const width = SIZE.WIDTH.MAX;
        const lines = wrapText(text, width, state.zoomRatio).length;
        const lineHeight = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * state.zoomRatio;
        const padding = TEXTAREA_PADDING.VERTICAL * state.zoomRatio;

        return Math.max(
            SIZE.SECTION_HEIGHT * state.zoomRatio,
            lines * lineHeight + padding
        );
    }, [state.zoomRatio]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
        const newValue = e.target.value;
        const height = calculateDynamicHeight(newValue);

        setLocalHeights(prev => {
            const newHeights = [...prev];
            newHeights[index] = height / state.zoomRatio;
            return newHeights;
        });

        dispatch({
            type: 'UPDATE_TEXT',
            payload: { id: element!.id, index, value: newValue }
        });

        const textarea = fieldRefs.current[index];
        if (textarea) {
            textarea.style.height = `${height}px`;
        }
    }, [element, state.zoomRatio, dispatch, calculateDynamicHeight]);

    const handleTabNavigation = useCallback((currentIndex: number) => {
        const nextIndex = currentIndex + 1;
        if (element && nextIndex < element.texts.length) {
            const nextField = fieldRefs.current[nextIndex];
            if (nextField) {
                const { scrollX, scrollY } = window;
                nextField.focus({ preventScroll: true });
                
                // タブ移動時もカーソルを文字列の末尾に配置
                const textLength = element.texts[nextIndex]?.length || 0;
                nextField.setSelectionRange(textLength, textLength);
                
                setActiveIndex(nextIndex);
                window.scrollTo(scrollX, scrollY);
            }
        } else {
            onEndEditing?.();
            dispatch({ type: 'END_EDITING' });
        }
    }, [element, onEndEditing, dispatch]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            handleTabNavigation(index);
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            onEndEditing?.();
            dispatch({ type: 'END_EDITING' });
        }
        if (e.key === 'Enter' && (e.altKey || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onEndEditing?.();
            dispatch({ type: 'END_EDITING' });
        }
    };

    if (!element || !isMounted) return null;

    return (
        <>
            {element.texts.map((text, index) => {
                const yPosition = localHeights
                    .slice(0, index)
                    .reduce((sum, h) => sum + h, 0) * state.zoomRatio;

                const width = SIZE.WIDTH.MAX * state.zoomRatio;
                const height = calculateDynamicHeight(text);

                return (
                    <textarea
                        key={`${element.id}-${index}`}
                        ref={(el) => {
                            fieldRefs.current[index] = el;
                            if (index === activeIndex && isMounted) el?.focus({ preventScroll: true });
                                                        }}
                        value={text}
                        onChange={(e) => handleChange(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            left: `${element.x * state.zoomRatio}px`,
                            top: `${element.y * state.zoomRatio + yPosition}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                            minWidth: `${SIZE.WIDTH.MAX * state.zoomRatio}px`,
                            maxWidth: `${SIZE.WIDTH.MAX * state.zoomRatio}px`,
                            minHeight: `${SIZE.SECTION_HEIGHT * state.zoomRatio}px`,
                            margin: '1px 1px',
                            fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
                            lineHeight: `${LINE_HEIGHT_RATIO}em`,
                            padding: `0 3px`,
                            fontFamily,
                            backgroundColor,
                            color: textColor,
                            boxSizing: 'border-box',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            resize: 'none',
                            zIndex: 10000,
                            opacity: 1,
                            transition: 'all 0.2s ease-in-out',
                            pointerEvents: 'all',
                        }}
                    />
                );
            })}
        </>
    );
};

export default React.memo(InputFields);