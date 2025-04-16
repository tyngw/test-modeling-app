// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect, useRef } from 'react';
import { calculateCanvasSize } from '../utils/layoutUtilities';
import { ICONBAR_HEIGHT } from '../config/elementSettings';

interface ElementWithDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeEffectProps {
  setCanvasSize: React.Dispatch<React.SetStateAction<{
    width: number;
    height: number;
  }>>;
  setDisplayArea: React.Dispatch<React.SetStateAction<string>>;
  state: {
    elements: { [key: string]: ElementWithDimensions };
    zoomRatio: number;
  };
}

const useResizeEffect = ({ 
  setCanvasSize, 
  setDisplayArea,
  state 
}: ResizeEffectProps) => {
    // 初期化済みかどうかを追跡するref
    const initializedRef = useRef(false);

    // リサイズ時の処理（ウィンドウサイズ変更時）
    useEffect(() => {
        const handleResize = () => {
            if (typeof window === 'undefined') return;

            const newCanvasSize = calculateCanvasSize(state.elements);
            const maxHeight = window.innerHeight - ICONBAR_HEIGHT * 2;
            newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
            newCanvasSize.height = Math.max(newCanvasSize.height, maxHeight);
            
            // 拡大率を適用したキャンバスサイズ
            const scaledCanvasSize = {
                width: newCanvasSize.width * state.zoomRatio,
                height: newCanvasSize.height * state.zoomRatio,
            };
            
            // 表示領域の計算（拡大率の逆数で割ることで正しい表示領域を得る）
            const viewWidth = Math.ceil(window.innerWidth / state.zoomRatio);
            const viewHeight = Math.ceil(maxHeight / state.zoomRatio);
            
            setCanvasSize(scaledCanvasSize);
            setDisplayArea(`0 0 ${viewWidth} ${viewHeight}`);
            
            // 初期化完了をマーク
            initializedRef.current = true;
        };

        // ウィンドウリサイズイベントのリスナーを追加
        window.addEventListener('resize', handleResize);
        
        // 初期化時の処理を強制的に実行（リロード時にも必ず実行される）
        handleResize();
        
        // クリーンアップ関数
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [state.elements, state.zoomRatio, setCanvasSize, setDisplayArea]);

    // zoomRatioの変更を検知して明示的に更新処理を実行
    useEffect(() => {
        if (typeof window === 'undefined' || !initializedRef.current) return;

        const maxHeight = window.innerHeight - ICONBAR_HEIGHT * 2;
        
        // 既存のキャンバスサイズを取得し、拡大率を適用
        const currentSize = calculateCanvasSize(state.elements);
        const width = Math.max(currentSize.width, window.innerWidth);
        const height = Math.max(currentSize.height, maxHeight);
        
        // 拡大率を適用
        setCanvasSize({
            width: width * state.zoomRatio,
            height: height * state.zoomRatio
        });
        
        // 表示領域も拡大率に合わせて更新
        const viewWidth = Math.ceil(window.innerWidth / state.zoomRatio);
        const viewHeight = Math.ceil(maxHeight / state.zoomRatio);
        setDisplayArea(`0 0 ${viewWidth} ${viewHeight}`);
    }, [state.zoomRatio, setCanvasSize, setDisplayArea, state.elements]);
};

export default useResizeEffect;