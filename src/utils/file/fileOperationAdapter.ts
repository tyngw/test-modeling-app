// src/utils/file/fileOperationAdapter.ts

import { Element } from '../../types/types';
import { isVSCodeExtension } from '../environment/environmentDetector';
import {
  saveSvg as webSaveSvg,
  saveElements as webSaveElements,
  loadElements as webLoadElements,
} from './fileHelpers';

/**
 * ファイル操作の抽象化インターフェース
 * 環境に応じて適切なファイル操作を提供
 */
export interface FileOperationAdapter {
  saveSvg: (svgElement: SVGSVGElement, fileName: string) => Promise<void>;
  saveElements: (elements: Element[], fileName: string) => Promise<void>;
  loadElements: (
    fileName?: string,
  ) => Promise<{ elements: Record<string, Element>; fileName: string }>;
}

/**
 * ブラウザ環境でのファイル操作実装
 */
class BrowserFileOperations implements FileOperationAdapter {
  async saveSvg(svgElement: SVGSVGElement, fileName: string): Promise<void> {
    webSaveSvg(svgElement, fileName);
  }

  async saveElements(elements: Element[], fileName: string): Promise<void> {
    webSaveElements(elements, fileName);
  }

  async loadElements(): Promise<{ elements: Record<string, Element>; fileName: string }> {
    return new Promise((resolve, reject) => {
      // ファイル入力要素を動的に作成
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (event) => {
        try {
          const result = await webLoadElements(event);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }
}

/**
 * VSCode拡張環境でのファイル操作実装
 */
class VSCodeFileOperations implements FileOperationAdapter {
  private getVSCodeAPI(): any {
    if (typeof window !== 'undefined' && (window as any).vscodeFileAPI) {
      return (window as any).vscodeFileAPI;
    }
    throw new Error('VSCode API が利用できません');
  }

  async saveSvg(svgElement: SVGSVGElement, fileName: string): Promise<void> {
    try {
      // SVGを文字列に変換
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const vscodeAPI = this.getVSCodeAPI();

      // VSCode拡張のファイル保存APIを呼び出し
      vscodeAPI.saveFile(
        {
          type: 'svg',
          content: svgData,
        },
        fileName,
      );
    } catch (error) {
      console.error('SVG保存エラー:', error);
      throw error;
    }
  }

  async saveElements(elements: Element[], fileName: string): Promise<void> {
    try {
      const vscodeAPI = this.getVSCodeAPI();

      // 要素データをJSONとして保存
      vscodeAPI.saveFile(
        {
          type: 'elements',
          content: elements,
        },
        fileName,
      );
    } catch (error) {
      console.error('要素保存エラー:', error);
      throw error;
    }
  }

  async loadElements(
    fileName?: string,
  ): Promise<{ elements: Record<string, Element>; fileName: string }> {
    return new Promise((resolve, reject) => {
      try {
        const vscodeAPI = this.getVSCodeAPI();

        // ファイル読み込み完了時のコールバックを設定
        (window as any).handleFileLoaded = (data: any) => {
          try {
            resolve({
              elements: data.content,
              fileName: data.fileName,
            });
          } catch (error) {
            reject(error);
          }
        };

        // VSCode拡張のファイル読み込みAPIを呼び出し
        vscodeAPI.loadFile(fileName);
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        reject(error);
      }
    });
  }
}

/**
 * 環境に応じたファイル操作インスタンスを取得
 */
export function createFileOperationAdapter(): FileOperationAdapter {
  if (isVSCodeExtension()) {
    return new VSCodeFileOperations();
  } else {
    return new BrowserFileOperations();
  }
}

/**
 * グローバルなファイル操作インスタンス
 */
export const fileOperationAdapter = createFileOperationAdapter();
