// src/utils/security/__tests__/security.test.ts

import { 
  sanitizeText, 
  escapeForJson, 
  escapeHtmlAttribute, 
  isValidUrl, 
  sanitizeFilename, 
  sanitizeObject, 
  sanitizeApiResponse 
} from '../sanitization';

import { 
  validateApiKey, 
  validateTextInput, 
  validateJsonData, 
  validateFileContent, 
  validateSettingValue, 
  validateExternalUrl 
} from '../validation';

describe('セキュリティ機能のテスト', () => {
  describe('sanitizeText', () => {
    test('基本的なHTMLタグを除去する', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello World';
      const result = sanitizeText(maliciousInput);
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<script>');
    });

    test('JavaScriptプロトコルを除去する', () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const result = sanitizeText(maliciousInput);
      expect(result).toBe('');
    });

    test('データURLを除去する', () => {
      const maliciousInput = 'data:text/html,<script>alert("XSS")</script>';
      const result = sanitizeText(maliciousInput);
      expect(result).toBe(',');
    });

    test('通常のテキストはそのまま保持する', () => {
      const normalText = 'これは通常のテキストです。';
      const result = sanitizeText(normalText);
      expect(result).toBe(normalText);
    });

    test('改行とスペースを保持する', () => {
      const textWithNewlines = 'Line 1\nLine 2\n  Line 3';
      const result = sanitizeText(textWithNewlines);
      expect(result).toBe(textWithNewlines);
    });
  });

  describe('escapeForJson', () => {
    test('JSON特殊文字をエスケープする', () => {
      const input = '{"test": "value"}';
      const result = escapeForJson(input);
      expect(result).toBe('{\\"test\\": \\"value\\"}');
    });

    test('制御文字をエスケープする', () => {
      const input = 'text\nwith\ttabs\rand\bbackspace';
      const result = escapeForJson(input);
      expect(result).toBe('text\\nwith\\ttabs\\rand\\bbackspace');
    });
  });

  describe('isValidUrl', () => {
    test('有効なHTTPSのURLを認識する', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com/path?param=value')).toBe(true);
    });

    test('有効なHTTPのURLを認識する', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('無効なプロトコルを拒否する', () => {
      expect(isValidUrl('javascript:alert("XSS")')).toBe(false);
      expect(isValidUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    test('無効なURLを拒否する', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(' ')).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    test('危険な文字を除去する', () => {
      const dangerous = 'file<script>.txt';
      const result = sanitizeFilename(dangerous);
      expect(result).toBe('file.txt');
    });

    test('ファイルパス区切り文字を除去する', () => {
      const pathTraversal = '../../../etc/passwd';
      const result = sanitizeFilename(pathTraversal);
      expect(result).toBe('etcpasswd');
    });

    test('通常のファイル名はそのまま保持する', () => {
      const normal = 'document_2024.pdf';
      const result = sanitizeFilename(normal);
      expect(result).toBe(normal);
    });
  });

  describe('validateTextInput', () => {
    test('通常のテキストを許可する', () => {
      expect(validateTextInput('Hello World')).toBe(true);
      expect(validateTextInput('日本語のテキスト')).toBe(true);
      expect(validateTextInput('Text with numbers 123')).toBe(true);
    });

    test('危険なスクリプトタグを拒否する', () => {
      expect(validateTextInput('<script>alert("XSS")</script>')).toBe(false);
      expect(validateTextInput('text<script>alert("XSS")</script>more text')).toBe(false);
    });

    test('JavaScriptプロトコルを拒否する', () => {
      expect(validateTextInput('javascript:alert("XSS")')).toBe(false);
      expect(validateTextInput('JAVASCRIPT:alert("XSS")')).toBe(false);
    });

    test('データURLを拒否する', () => {
      expect(validateTextInput('data:text/html,<script>alert("XSS")</script>')).toBe(false);
    });

    test('eval関数の使用を拒否する', () => {
      expect(validateTextInput('eval("alert(\'XSS\')")')).toBe(false);
    });
  });

  describe('validateJsonData', () => {
    test('有効なJSONを許可する', () => {
      expect(validateJsonData('{"key": "value"}')).toBe(true);
      expect(validateJsonData('{"number": 123, "boolean": true}')).toBe(true);
      expect(validateJsonData('[]')).toBe(true);
    });

    test('無効なJSONを拒否する', () => {
      expect(validateJsonData('{"key": value}')).toBe(false);  // クォートなし
      expect(validateJsonData('{key: "value"}')).toBe(false);  // キーにクォートなし
      expect(validateJsonData('{"key": "value",}')).toBe(false);  // 末尾カンマ
    });

    test('空文字列や非文字列を拒否する', () => {
      expect(validateJsonData('')).toBe(false);
      expect(validateJsonData('   ')).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    test('オブジェクトの文字列プロパティをサニタイズする', () => {
      const input = {
        safe: 'normal text',
        dangerous: '<script>alert("XSS")</script>',
        number: 123,
        boolean: true
      };
      
      const result = sanitizeObject(input);
      expect(result.safe).toBe('normal text');
      expect(result.dangerous).toBe('');
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
    });

    test('ネストしたオブジェクトもサニタイズする', () => {
      const input = {
        nested: {
          safe: 'normal text',
          dangerous: '<script>alert("XSS")</script>'
        }
      };
      
      const result = sanitizeObject(input);
      expect(result.nested.safe).toBe('normal text');
      expect(result.nested.dangerous).toBe('');
    });

    test('配列内のオブジェクトもサニタイズする', () => {
      const input = {
        items: [
          { text: 'safe text' },
          { text: '<script>alert("XSS")</script>' }
        ]
      };
      
      const result = sanitizeObject(input);
      expect(result.items[0].text).toBe('safe text');
      expect(result.items[1].text).toBe('');
    });
  });

  describe('sanitizeApiResponse - 文字列バージョン', () => {
    test('文字列レスポンスをサニタイズする', () => {
      const maliciousResponse = 'normal text <script>alert("XSS")</script>';
      const result = sanitizeApiResponse(maliciousResponse);
      expect(result).toBe('normal text ');
    });
  });

  describe('sanitizeApiResponse - オブジェクトバージョン', () => {
    test('オブジェクトレスポンスをサニタイズする', () => {
      const maliciousResponse = {
        content: 'normal text <script>alert("XSS")</script>',
        data: {
          value: '<img src="x" onerror="alert(\'XSS\')">'
        }
      };
      
      const result = sanitizeApiResponse(maliciousResponse);
      expect(result.content).toBe('normal text ');
      expect(result.data.value).toBe('');
    });
  });

  describe('validateFileContent', () => {
    test('通常のJSONコンテンツを許可する', () => {
      const content = JSON.stringify({ elements: [], settings: {} });
      expect(validateFileContent(content)).toBe(true);
    });

    test('スクリプトタグを含むコンテンツを拒否する', () => {
      const content = '{"text": "<script>alert(\\"XSS\\")</script>"}';
      expect(validateFileContent(content)).toBe(false);
    });

    test('JavaScriptプロトコルを含むコンテンツを拒否する', () => {
      const content = '{"url": "javascript:alert(\\"XSS\\")"}';
      expect(validateFileContent(content)).toBe(false);
    });

    test('過度に長いコンテンツを拒否する', () => {
      const longContent = 'a'.repeat(1024 * 1024 + 1); // 1MB + 1バイト
      expect(validateFileContent(longContent)).toBe(false);
    });
  });
});

describe('統合セキュリティテスト', () => {
  test('複合的なXSS攻撃パターンを防御する', () => {
    const attacks = [
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      'javascript:/*-/*`/*\\`/*\'/*"/**/(/* */onerror=alert(\'XSS\') )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert(//XSS//)//>'
    ];

    attacks.forEach(attack => {
      expect(validateTextInput(attack)).toBe(false);
      const sanitized = sanitizeText(attack);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
    });
  });

  test('ファイルアップロード攻撃パターンを防御する', () => {
    const maliciousFilenames = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      'test<script>alert("XSS")</script>.json',
      'test.php.json',
      '.htaccess'
    ];

    maliciousFilenames.forEach(filename => {
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('..\\');
      expect(sanitized).not.toContain('<script');
    });
  });

  test('JSON インジェクション攻撃を防御する', () => {
    const maliciousJsonInputs = [
      '{"__proto__": {"isAdmin": true}}',
      '{"constructor": {"prototype": {"isAdmin": true}}}',
      '{"test": "value", "evil": "<script>alert(\\"XSS\\")</script>"}'
    ];

    maliciousJsonInputs.forEach(input => {
      if (validateJsonData(input)) {
        const parsed = JSON.parse(input);
        const sanitized = sanitizeObject(parsed);
        // プロトタイプ汚染の確認
        expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
        // XSS攻撃の確認
        if (sanitized.evil) {
          expect(sanitized.evil).not.toContain('<script');
        }
      }
    });
  });
});
