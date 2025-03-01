// src/components/canvasArea.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement from './ideaElement';
import InputFields from './inputFields';
import ModalWindow from './modalWindow';
import useResizeEffect from '../hooks/useResizeEffect';
import { useCanvas } from '../context/canvasContext';
import { Marker } from './marker';
import { keyActionMap } from '../constants/keyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { helpContent } from '../constants/helpContent';
import { ICONBAR_HEIGHT, HEADER_HEIGHT } from '../constants/elementSettings';
import { Element } from '../types';

interface CanvasAreaProps {
  isHelpOpen: boolean;
  toggleHelp: () => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ isHelpOpen, toggleHelp }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, dispatch } = useCanvas();
  const { elements, zoomRatio } = state;
  const [displayScopeSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [displayArea, setDisplayArea] = useState(
    `0 0 ${displayScopeSize.width} ${displayScopeSize.height - ICONBAR_HEIGHT}`
  );
  const editingNode = Object.values(elements).find((element) => (element as Element).editing) as Element | undefined;

  useEffect(() => {
    if (!editingNode) svgRef.current?.focus();
  }, [editingNode]);

  useResizeEffect({ setCanvasSize, setDisplayArea, state });
  useClickOutside(svgRef, !!editingNode);

  const {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget,
    dropPosition,
    draggingElement
  } = useElementDragEffect();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
    const actionType = keyActionMap[keyCombo];
    if (actionType) dispatch({ type: actionType });
  };

  return (
    <>
      <div style={{
        position: 'absolute',
        top: HEADER_HEIGHT,
        left: 0,
        overflow: 'auto'
      }}>
        <ModalWindow isOpen={isHelpOpen} onClose={toggleHelp}>
          <div dangerouslySetInnerHTML={{ __html: helpContent }} />
        </ModalWindow>
        <svg
          data-testid="view-area"
          ref={svgRef}
          width={displayScopeSize.width}
          height={displayScopeSize.height}
          viewBox={displayArea}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{ outline: 'none' }}
          className="svg-element"
        >
          {Object.values(elements)
            .filter((element): element is Element => element.visible)
            .map(element => (
              <React.Fragment key={element.id}>
                <IdeaElement
                  element={element}
                  currentDropTarget={currentDropTarget as Element | null}
                  dropPosition={dropPosition}
                  draggingElement={draggingElement}
                  handleMouseDown={handleMouseDown as unknown as (e: React.MouseEvent<SVGElement>, element: Element) => void}
                  handleMouseUp={handleMouseUp}
                />
              </React.Fragment>
            ))}
        </svg>
        <InputFields
          element={editingNode as Element | undefined}
          onEndEditing={() => svgRef.current?.focus()}
        />
      </div>
    </>
  );
};

export default React.memo(CanvasArea);