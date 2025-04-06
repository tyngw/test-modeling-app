// src/config/settingsConfig.ts
import { 
  MARKER_TYPES, 
  ELEM_STYLE, 
  DEFAULT_CANVAS_BACKGROUND_COLOR, 
  DEFAULT_TEXT_COLOR,
  DEFAULT_CONNECTION_PATH_COLOR
} from './elementSettings';
import { SettingTab } from '../types/settingsTypes';

export const SETTINGS_TABS: SettingTab[] = [
  {
    id: 0,
    label: "Elements Setting",
    fields: [
      {
        key: 'numberOfSections',
        label: 'Number of sections',
        type: 'number',
        helperText: '同時に表示するセクションの数（1〜10） ※現在のタブと新規作成されるタブのデフォルト値として設定されます',
        defaultValue: 3,
        validation: {
          min: 1,
          max: 10,
          required: true
        }
      },
      {
        key: 'markerType',
        label: 'Default Marker Type',
        type: 'select',
        helperText: '新規要素作成時のデフォルトマーカータイプ',
        defaultValue: MARKER_TYPES.NONE,
        options: [
          { value: MARKER_TYPES.NONE, label: 'None' },
          { value: MARKER_TYPES.ARROW, label: 'Arrow' },
          { value: MARKER_TYPES.CIRCLE, label: 'Circle' },
          { value: MARKER_TYPES.SQUARE, label: 'Square' },
          { value: MARKER_TYPES.DIAMOND, label: 'Diamond' },
          { value: MARKER_TYPES.FILLED_ARROW, label: 'Filled Arrow' },
          { value: MARKER_TYPES.FILLED_CIRCLE, label: 'Filled Circle' },
          { value: MARKER_TYPES.FILLED_SQUARE, label: 'Filled Square' },
          { value: MARKER_TYPES.FILLED_DIAMOND, label: 'Filled Diamond' }
        ]
      },
      {
        key: 'canvasBackgroundColor',
        label: 'Canvas Background Color',
        type: 'color',
        helperText: 'キャンバスの背景色',
        defaultValue: DEFAULT_CANVAS_BACKGROUND_COLOR
      },
      {
        key: 'elementColor',
        label: 'Element Color',
        type: 'color',
        helperText: '要素の背景色',
        defaultValue: ELEM_STYLE.NORMAL.COLOR
      },
      {
        key: 'textColor',
        label: 'Text Color',
        type: 'color',
        helperText: 'テキストの色',
        defaultValue: DEFAULT_TEXT_COLOR
      },
      {
        key: 'strokeColor',
        label: 'Stroke Color',
        type: 'color',
        helperText: '要素の枠線色',
        defaultValue: ELEM_STYLE.NORMAL.STROKE_COLOR
      },
      {
        key: 'selectedStrokeColor',
        label: 'Selected Stroke Color',
        type: 'color',
        helperText: '選択時の要素の枠線色',
        defaultValue: ELEM_STYLE.SELECTED.STROKE_COLOR
      },
      {
        key: 'strokeWidth',
        label: 'Stroke Width',
        type: 'number',
        helperText: '要素の枠線の太さ',
        defaultValue: 1,
        validation: {
          min: 0,
          step: 0.5,
          required: true
        }
      },
      {
        key: 'connectionPathColor',
        label: 'Connection Path Color',
        type: 'color',
        helperText: '接続線の色',
        defaultValue: DEFAULT_CONNECTION_PATH_COLOR
      },
      {
        key: 'connectionPathStroke',
        label: 'Connection Path Stroke',
        type: 'number',
        helperText: '接続線の太さ',
        defaultValue: 1,
        validation: {
          min: 0.5,
          step: 0.5,
          required: true
        }
      },
      {
        key: 'fontFamily',
        label: 'Font Family',
        type: 'text',
        helperText: '表示に使用するフォントファミリ',
        defaultValue: ''
      },
    ]
  },
  {
    id: 1,
    label: "API Setting",
    fields: [
      {
        key: 'modelType',
        label: 'Select Model',
        type: 'radio',
        helperText: 'APIモデルの選択',
        defaultValue: 'gemini-1.5-flash',
        options: [
          { value: 'gemini-1.5-flash', label: 'Gemini-1.5-flash' },
          { value: 'gemini-2.0-flash', label: 'Gemini-2.0-flash' }
        ]
      },
      {
        key: 'apiKey',
        label: 'Gemini API Key',
        type: 'text',
        helperText: '入力されたキーは暗号化してlocalStorageに保存されます。サーバに送信されることはありません。',
        defaultValue: ''
      }
    ]
  },
  {
    id: 2,
    label: "Prompt",
    fields: [
      {
        key: 'prompt',
        label: 'inputText',
        type: 'text',
        helperText: '',
        defaultValue: ''
      },
      {
        key: 'systemPromptTemplate',
        label: 'SystemPromptTemplate',
        type: 'text',
        helperText: '',
        defaultValue: ''
      }
    ]
  }
];