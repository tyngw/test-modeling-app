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
  private getVSCodeAPI(): {
    saveFile: (data: { type: string; content: unknown }, fileName: string) => void;
    loadFile: (fileName?: string) => void;
  } {
    const win = window as unknown as {
      vscodeFileAPI?: {
        saveFile: (data: { type: string; content: unknown }, fileName: string) => void;
        loadFile: (fileName?: string) => void;
      };
    };

    if (typeof window !== 'undefined' && win.vscodeFileAPI) {
      return win.vscodeFileAPI;
    }
    throw new Error('VSCode API が利用できません');
  }

  async saveSvg(svgElement: SVGSVGElement, fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // SVGを文字列に変換（現在のfileHelpers.tsと同じロジック）
        const svgElementClone = svgElement.cloneNode(true) as SVGElement;
        // SVGから不要な属性を削除
        svgElementClone.removeAttribute('style');
        svgElementClone.removeAttribute('transform');

        const svgData = new XMLSerializer().serializeToString(svgElementClone);
        const preface = '<?xml version="1.0" standalone="no"?>\r\n';
        const fullSvgContent = preface + svgData;

        const vscodeAPI = this.getVSCodeAPI();

        // メッセージハンドラーを一時的に設定
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'saveCompleted') {
            // イベントリスナーを削除
            window.removeEventListener('message', messageHandler);

            if (event.data.success) {
              resolve();
            } else if (event.data.cancelled) {
              reject(new Error('SVG保存がキャンセルされました'));
            } else {
              reject(new Error(event.data.error || 'SVGの保存に失敗しました'));
            }
          }
        };

        // メッセージリスナーを追加
        window.addEventListener('message', messageHandler);

        // タイムアウトを設定（30秒）
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('SVG保存がタイムアウトしました'));
        }, 30000);

        // 成功時にタイムアウトをクリア
        const originalResolve = resolve;
        resolve = () => {
          clearTimeout(timeoutId);
          originalResolve();
        };

        const originalReject = reject;
        reject = (reason) => {
          clearTimeout(timeoutId);
          originalReject(reason);
        };

        // VSCode拡張のファイル保存APIを呼び出し
        vscodeAPI.saveFile(
          {
            type: 'svg',
            content: fullSvgContent,
          },
          fileName,
        );
      } catch (error) {
        console.error('SVG保存エラー:', error);
        reject(error);
      }
    });
  }

  async saveElements(elements: Element[], fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const vscodeAPI = this.getVSCodeAPI();

        // メッセージハンドラーを一時的に設定
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'saveCompleted') {
            // イベントリスナーを削除
            window.removeEventListener('message', messageHandler);

            if (event.data.success) {
              resolve();
            } else if (event.data.cancelled) {
              reject(new Error('ファイル保存がキャンセルされました'));
            } else {
              reject(new Error(event.data.error || 'ファイルの保存に失敗しました'));
            }
          }
        };

        // メッセージリスナーを追加
        window.addEventListener('message', messageHandler);

        // タイムアウトを設定（30秒）
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('ファイル保存がタイムアウトしました'));
        }, 30000);

        // 成功時にタイムアウトをクリア
        const originalResolve = resolve;
        resolve = () => {
          clearTimeout(timeoutId);
          originalResolve();
        };

        const originalReject = reject;
        reject = (reason) => {
          clearTimeout(timeoutId);
          originalReject(reason);
        };

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
        reject(error);
      }
    });
  }

  async loadElements(
    fileName?: string,
  ): Promise<{ elements: Record<string, Element>; fileName: string }> {
    return new Promise((resolve, reject) => {
      try {
        const vscodeAPI = this.getVSCodeAPI();

        // メッセージハンドラーを一時的に設定
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'fileLoaded') {
            // イベントリスナーを削除
            window.removeEventListener('message', messageHandler);

            try {
              // データの形式を確認・変換
              let elements = event.data.data.content;
              let fileName = event.data.data.fileName;

              // contentがオブジェクトの場合は、elementsプロパティを探す
              if (elements && typeof elements === 'object' && !Array.isArray(elements)) {
                if (elements.elements) {
                  elements = elements.elements;
                  fileName = elements.fileName || fileName;
                }
              }

              resolve({
                elements: elements,
                fileName: fileName,
              });
            } catch (error) {
              console.error('📂 Error processing loaded file:', error);
              reject(error);
            }
          }
        };

        // メッセージリスナーを追加
        window.addEventListener('message', messageHandler);

        // タイムアウトを設定（30秒）
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('ファイル読み込みがタイムアウトしました'));
        }, 30000);

        // 成功時にタイムアウトをクリア
        const originalResolve = resolve;
        resolve = (value) => {
          clearTimeout(timeoutId);
          originalResolve(value);
        };

        const originalReject = reject;
        reject = (reason) => {
          clearTimeout(timeoutId);
          originalReject(reason);
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
 * 毎回動的に生成して最新の環境判定を確実に反映
 */
export const fileOperationAdapter = {
  get loadElements() {
    const adapter = createFileOperationAdapter();
    return adapter.loadElements.bind(adapter);
  },
  get saveElements() {
    const adapter = createFileOperationAdapter();
    return adapter.saveElements.bind(adapter);
  },
  get saveSvg() {
    const adapter = createFileOperationAdapter();
    return adapter.saveSvg.bind(adapter);
  },
};
