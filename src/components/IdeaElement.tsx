// src/components/IdeaElement.tsx
import React, { useCallback, useMemo } from 'react';
import { useCanvas } from '../context/CanvasContext';
import TextSection from './TextDisplayArea';
import { calculateElementWidth } from '../utils/TextareaHelpers';
import { 
    CURVE_CONTROL_OFFSET, 
    ARROW_OFFSET, 
    DEFAULT_FONT_SIZE 
} from '../constants/ElementSettings';
import { Element as CanvasElement } from '../types';

const SECTION_KEYS = ['text', 'text2', 'text3'] as const;

interface IdeaElementProps {
  element: CanvasElement;
  overDropTarget: CanvasElement | null;
  handleMouseDown: (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void;
  handleMouseUp: () => void;
}

const IdeaElement: React.FC<IdeaElementProps> = ({ 
    element, 
    overDropTarget, 
    handleMouseDown, 
    handleMouseUp 
}) => {
    const { state, dispatch } = useCanvas();
    const parentElement = state.elements[element.parentId!];
    const overDropTargetId = overDropTarget?.id || -1;

    const sectionHeights = [
        element.section1Height,
        element.section2Height,
        element.section3Height
    ];

    const handleHeightChange = useCallback((sectionIndex: number, newHeight: number) => {
        const sectionKey = `section${sectionIndex + 1}Height`;
        const currentHeight = element[sectionKey as keyof CanvasElement] as number;
        
        if (currentHeight !== null && Math.abs(newHeight - currentHeight) > 1) {
            const newSectionHeights = [...sectionHeights];
            newSectionHeights[sectionIndex] = newHeight;

            const texts = [element.text, element.text2, element.text3];
            const newWidth = calculateElementWidth(texts);

            dispatch({
                type: 'UPDATE_NODE_SIZE',
                payload: {
                    id: element.id,
                    width: newWidth,
                    height: element.height + (newHeight - currentHeight),
                    sectionHeights: newSectionHeights
                }
            });
        }
    }, [dispatch, element, sectionHeights]);
    
    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_NODE', payload: element.id });
    };

    const renderConnectionPath = useCallback(() => {
        if (!parentElement) return null;
        const totalHeight = element.height;
        const pathCommands = [
            `M ${element.x},${element.y + totalHeight / 2}`,
            `C ${element.x - CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
            `${parentElement.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentElement.y + parentElement.height / 2}`,
            `${parentElement.x + parentElement.width + ARROW_OFFSET},${parentElement.y + parentElement.height / 2}`
        ].join(' ');
        return (
            <path
                d={pathCommands}
                stroke="black"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
            />
        );
    }, [parentElement, element]);

    return (
        <React.Fragment key={element.id}>
            {renderConnectionPath()}
            <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                className={`element ${element.selected ? 'element-selected' : 'element-unselected'}`}
                rx="2"
                onClick={handleSelect}
                onDoubleClick={() => dispatch({ type: 'EDIT_NODE' })}
                onMouseDown={(e) => handleMouseDown(e, element)}
                onMouseUp={handleMouseUp}
                style={{ 
                    fill: element.id === overDropTargetId ? 'lightblue' : 'white',
                    pointerEvents: 'all'
                }}
            />
            {SECTION_KEYS.map((key, index) => (
                <React.Fragment key={`${element.id}-section-${index}`}>
                    <TextSection
                        x={element.x}
                        y={element.y + sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)}
                        width={element.width}
                        height={sectionHeights[index]}
                        text={element[key]}
                        fontSize={DEFAULT_FONT_SIZE}
                        zoomRatio={state.zoomRatio}
                        onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
                    />
                    
                    {index < SECTION_KEYS.length - 1 && (
                        <line
                            x1={element.x}
                            y1={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                            x2={element.x + element.width}
                            y2={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                            stroke="black"
                            strokeWidth="1"
                        />
                    )}
                </React.Fragment>
            ))}
        </React.Fragment>
    );
};

export default React.memo(IdeaElement);