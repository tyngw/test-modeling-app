// src/setupTests.ts

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// 背景: native canvas パッケージは脆弱な依存を含むため、テストでは必要な文字幅計測だけをモックする。
// 前提: アプリ本体はブラウザの CanvasRenderingContext2D を利用でき、Jest では layout 用の概算幅で十分。
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((contextId: string) => {
    if (contextId !== '2d') {
      return null;
    }

    return {
      font: '',
      measureText: (text: string) => ({
        width: text.length * 8,
      }),
    };
  }),
});
