// src/components/settingsModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import ModalWindow from './ModalWindow';
import SettingsIcon from '../icons/SettingsIcon';
import { SettingField } from './SettingField';
import { Box, Button, Tabs, Tab } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { SETTINGS_TABS, SettingField as SettingFieldType } from '../../types/settings';
import {
  getSystemPromptTemplate,
  getModelType,
  getPrompt,
  getElementColor,
  getStrokeColor,
  getStrokeWidth,
  getFontFamily,
  getMarkerType,
  getConnectionPathColor,
  getConnectionPathStroke,
  getCanvasBackgroundColor,
  getTextColor,
  getSelectedStrokeColor,
  setSystemPromptTemplate,
  setModelType,
  setPrompt,
  setElementColor,
  setStrokeColor,
  setStrokeWidth,
  setFontFamily,
  setMarkerType,
  setConnectionPathColor,
  setConnectionPathStroke,
  setCanvasBackgroundColor,
  setTextColor,
  setSelectedStrokeColor,
  getApiKey,
  setApiKey,
} from '../../utils/storage/localStorageHelpers';
import { exportElementSettings, importElementSettings } from '../../utils/settingsExportImport';
import { useTabs } from '../../context/TabsContext';
import { getCurrentTheme, isDarkMode } from '../../utils/style/colorHelpers';
import { useIsMounted } from '../../hooks/UseIsMounted';
import { sanitizeText, sanitizeFilename } from '../../utils/security/sanitization';
import { validateJsonData, validateFileContent } from '../../utils/security/validation';
import { Action } from '../../types/actionTypes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: React.Dispatch<Action>;
  modalId?: string;
  onOpen?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  dispatch,
  modalId,
  onOpen,
}) => {
  const isMounted = useIsMounted();
  const [activeTab, setActiveTab] = useState(0);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [currentTheme, setCurrentTheme] = useState(() =>
    getCurrentTheme(getCanvasBackgroundColor()),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the tabs context for updating tab-specific state
  const {
    getCurrentTabNumberOfSections,
    updateCurrentTabNumberOfSections,
    getCurrentTabLayoutMode,
    updateCurrentTabLayoutMode,
  } = useTabs();

  // Set the theme mode based on canvas background color
  useEffect(() => {
    const backgroundColor = getCanvasBackgroundColor();
    const darkMode = isDarkMode(backgroundColor);
    setThemeMode(darkMode ? 'dark' : 'light');
    setCurrentTheme(getCurrentTheme(backgroundColor));
  }, [isMounted]);

  // 設定値の読み込み
  useEffect(() => {
    if (!isMounted || !isOpen) return;

    // 設定値の読み込み
    try {
      const loadedValues: Record<string, string | number> = {};

      // APIキーは同期的に取得
      loadedValues['apiKey'] = getApiKey();

      // 他の設定項目は同期的に取得
      loadedValues['systemPromptTemplate'] = getSystemPromptTemplate();
      loadedValues['modelType'] = getModelType();
      loadedValues['prompt'] = getPrompt();

      // Get numberOfSections and layoutMode from the current tab
      loadedValues['numberOfSections'] = getCurrentTabNumberOfSections();
      loadedValues['layoutMode'] = getCurrentTabLayoutMode();

      loadedValues['elementColor'] = getElementColor();
      loadedValues['strokeColor'] = getStrokeColor();
      loadedValues['strokeWidth'] = getStrokeWidth();
      loadedValues['fontFamily'] = getFontFamily();
      loadedValues['markerType'] = getMarkerType();
      loadedValues['connectionPathColor'] = getConnectionPathColor();
      loadedValues['connectionPathStroke'] = getConnectionPathStroke();
      loadedValues['canvasBackgroundColor'] = getCanvasBackgroundColor();
      loadedValues['textColor'] = getTextColor();
      loadedValues['selectedStrokeColor'] = getSelectedStrokeColor();

      setValues(loadedValues);
    } catch {
      // 設定の読み込みに失敗した場合はデフォルト値を使用
    }
  }, [isMounted, isOpen, getCurrentTabNumberOfSections, getCurrentTabLayoutMode]);

  // 設定が読み込まれる前はレンダリングしない
  if (!isMounted) {
    return null;
  }

  // Create Material-UI theme based on canvas background color
  const theme = createTheme({
    palette: {
      mode: themeMode,
      background: {
        default: currentTheme.MODAL.BACKGROUND,
        paper: currentTheme.MODAL.BACKGROUND,
      },
      text: {
        primary: currentTheme.MODAL.TEXT_COLOR,
        secondary: currentTheme.MODAL.TEXT_COLOR,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            color: currentTheme.MODAL.BUTTON_TEXT,
            borderColor: currentTheme.MODAL.BUTTON_BORDER,
          },
          contained: {
            backgroundColor: currentTheme.MODAL.BUTTON_PRIMARY_BACKGROUND,
            color: currentTheme.MODAL.BUTTON_PRIMARY_TEXT,
            '&:hover': {
              backgroundColor: currentTheme.MODAL.BUTTON_PRIMARY_BACKGROUND,
              opacity: 0.9,
            },
          },
          outlined: {
            backgroundColor: currentTheme.MODAL.BUTTON_BACKGROUND,
            '&:hover': {
              backgroundColor: currentTheme.MODAL.BUTTON_BACKGROUND,
              opacity: 0.9,
            },
          },
        },
      },
    },
  });

  const validateField = (field: SettingFieldType, value: string | number): boolean => {
    if (field.type === 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (field.validation?.required && (value === '' || isNaN(numValue))) return false;
      if (!isNaN(numValue)) {
        if (field.validation?.min !== undefined && numValue < field.validation.min) return false;
        if (field.validation?.max !== undefined && numValue > field.validation.max) return false;
      }
    }
    return true;
  };

  const handleValueChange = (field: SettingFieldType, value: string) => {
    setValues((prev) => ({ ...prev, [field.key]: value }));
    setErrors((prev) => ({
      ...prev,
      [field.key]: !validateField(field, value),
    }));
  };

  const handleSave = () => {
    let hasError = false;

    // 全フィールドの検証
    SETTINGS_TABS.forEach((tab) => {
      tab.fields.forEach((field) => {
        const value = values[field.key];
        if (!validateField(field, value)) {
          hasError = true;
          setErrors((prev) => ({ ...prev, [field.key]: true }));
        }
      });
    });

    if (hasError) return;

    // APIKeyは同期的に保存
    const apiKeyValue = values['apiKey'];
    if (apiKeyValue !== undefined) {
      setApiKey(String(apiKeyValue));
    }

    // 他の設定は同期的に保存
    const value = values['systemPromptTemplate'];
    if (value !== undefined) setSystemPromptTemplate(String(value));

    const modelType = values['modelType'];
    if (modelType !== undefined) setModelType(String(modelType));

    const prompt = values['prompt'];
    if (prompt !== undefined) setPrompt(String(prompt));

    // Update current tab state for numberOfSections
    const numberOfSections = values['numberOfSections'];
    if (numberOfSections !== undefined) {
      const numValue = Number(numberOfSections);
      // Update current tab state only
      updateCurrentTabNumberOfSections(numValue);
    }

    // Update current tab state for layoutMode
    const layoutMode = values['layoutMode'];
    if (layoutMode !== undefined) {
      updateCurrentTabLayoutMode(layoutMode as 'default' | 'mindmap');
    }

    const elementColor = values['elementColor'];
    if (elementColor !== undefined) setElementColor(String(elementColor));

    const strokeColor = values['strokeColor'];
    if (strokeColor !== undefined) setStrokeColor(String(strokeColor));

    const strokeWidth = values['strokeWidth'];
    if (strokeWidth !== undefined) setStrokeWidth(Number(strokeWidth));

    const fontFamily = values['fontFamily'];
    if (fontFamily !== undefined) setFontFamily(String(fontFamily));

    const markerType = values['markerType'];
    if (markerType !== undefined) setMarkerType(String(markerType));

    const connectionPathColor = values['connectionPathColor'];
    if (connectionPathColor !== undefined) setConnectionPathColor(String(connectionPathColor));

    const connectionPathStroke = values['connectionPathStroke'];
    if (connectionPathStroke !== undefined) setConnectionPathStroke(Number(connectionPathStroke));

    const canvasBackgroundColor = values['canvasBackgroundColor'];
    if (canvasBackgroundColor !== undefined)
      setCanvasBackgroundColor(String(canvasBackgroundColor));

    const textColor = values['textColor'];
    if (textColor !== undefined) setTextColor(String(textColor));

    const selectedStrokeColor = values['selectedStrokeColor'];
    if (selectedStrokeColor !== undefined) setSelectedStrokeColor(String(selectedStrokeColor));

    onClose();
  };

  const handleExportSettings = () => {
    // Use the utility function to export settings
    exportElementSettings(values, SETTINGS_TABS[0].fields);
  };

  const handleImportSettings = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル名のセキュリティチェック
    const sanitizedFilename = sanitizeFilename(file.name);
    if (!sanitizedFilename || !sanitizedFilename.endsWith('.json')) {
      alert('Invalid file name or format. Please select a valid JSON file.');
      if (event.target) event.target.value = '';
      return;
    }

    // ファイルサイズチェック（1MB制限）
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      alert('File size too large. Please select a file smaller than 1MB.');
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;

        // ファイル内容のセキュリティ検証
        if (!validateFileContent(content)) {
          alert('File content contains potentially dangerous data. Import cancelled.');
          if (event.target) event.target.value = '';
          return;
        }

        // JSONデータの検証
        if (!validateJsonData(content)) {
          alert('Invalid JSON format. Please check the file contents.');
          if (event.target) event.target.value = '';
          return;
        }

        // 基本的なHTMLエスケープ処理
        const sanitizedContent = sanitizeText(content);
        const importedSettings = JSON.parse(sanitizedContent);

        // Use the utility function to import and validate settings
        const { newValues, newErrors, hasError } = importElementSettings(
          importedSettings,
          values,
          errors,
          SETTINGS_TABS[0].fields,
        );

        if (hasError) {
          alert('Some imported settings are invalid and will be ignored.');
        }

        // Update state with imported values
        setValues(newValues);
        setErrors(newErrors);

        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      } catch {
        // 設定ファイルの解析に失敗
        alert('Failed to parse imported settings. Please check the file format.');
        // Reset file input on error
        if (event.target) event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
      title="Preference"
      icon={<SettingsIcon />}
      dispatch={dispatch}
      modalId={modalId}
      onOpen={onOpen}
    >
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            backgroundColor: currentTheme.MODAL.BACKGROUND,
            color: currentTheme.MODAL.TEXT_COLOR,
            padding: 2,
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '80vh',
            maxHeight: 600,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
          >
            {SETTINGS_TABS.map((tab) => (
              <Tab key={tab.id} label={tab.label} />
            ))}
          </Tabs>
          <Box
            sx={{
              mt: 2,
              flex: 1,
              overflowY: 'auto',
              // スクロールバーのスタイリング
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: currentTheme.MODAL.TEXT_COLOR,
                opacity: 0.2,
                borderRadius: '4px',
              },
            }}
          >
            {SETTINGS_TABS.map(
              (tab) =>
                activeTab === tab.id && (
                  <Box key={tab.id}>
                    {tab.fields.map((field) => (
                      <SettingField
                        key={field.key}
                        field={field}
                        value={values[field.key] ?? field.defaultValue}
                        error={errors[field.key]}
                        onChange={(value) => handleValueChange(field, value)}
                      />
                    ))}
                  </Box>
                ),
            )}
          </Box>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              display: 'flex',
              flexWrap: 'wrap', // ボタンが見切れないよう折り返し
              gap: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${currentTheme.MODAL.TEXT_COLOR}20`,
              backgroundColor: currentTheme.MODAL.BACKGROUND,
            }}
          >
            {/* Hidden file input for importing settings */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              style={{ display: 'none' }}
            />

            {/* Export/Import buttons with text labels */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeTab === 0 && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportSettings}
                  >
                    Export
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FileUploadIcon />}
                    onClick={handleImportSettings}
                  >
                    Import
                  </Button>
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                color="primary"
                disabled={Object.values(errors).some(Boolean)}
              >
                OK
              </Button>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    </ModalWindow>
  );
};

export default SettingsModal;
