// src/components/settingsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ModalWindow from './modalWindow';
import { SettingField } from './settings/SettingField';
import { Box, Button, Typography, Tabs, Tab } from '@mui/material';
import { SETTINGS_TABS, SettingField as SettingFieldType } from '../types/settings';
import { 
  getSystemPromptTemplate,
  getModelType,
  getPrompt,
  getNumberOfSections,
  getElementColor,
  getStrokeColor,
  getStrokeWidth,
  getFontFamily,
  getMarkerType,
  getConnectionPathColor,
  getConnectionPathStroke,
  getCanvasBackgroundColor,
  getTextColor,
  setSystemPromptTemplate,
  setModelType,
  setPrompt,
  setNumberOfSections,
  setElementColor,
  setStrokeColor,
  setStrokeWidth,
  setFontFamily,
  setMarkerType,
  setConnectionPathColor,
  setConnectionPathStroke,
  setCanvasBackgroundColor,
  setTextColor,
  getApiKey,
  setApiKey,
} from '../utils/localStorageHelpers';
import { useTabs } from '../context/tabsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Get the tabs context for updating tab-specific state
  const { getCurrentTabNumberOfSections, updateCurrentTabNumberOfSections } = useTabs();

  // クライアントサイドマウントのチェック
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 設定値の読み込み
  useEffect(() => {
    if (!isMounted || !isOpen) return;

    // 即時実行関数を使用して非同期処理を正しく実行
    (async () => {
      const loadedValues: Record<string, string | number> = {};
      
      try {
        // APIキーは非同期で取得
        const apiKey = await getApiKey();
        loadedValues['apiKey'] = apiKey;
        
        // 他の設定項目は同期的に取得
        loadedValues['systemPromptTemplate'] = getSystemPromptTemplate();
        loadedValues['modelType'] = getModelType();
        loadedValues['prompt'] = getPrompt();
        
        // Get numberOfSections from the current tab instead of global settings
        loadedValues['numberOfSections'] = getCurrentTabNumberOfSections();
        
        loadedValues['elementColor'] = getElementColor();
        loadedValues['strokeColor'] = getStrokeColor();
        loadedValues['strokeWidth'] = getStrokeWidth();
        loadedValues['fontFamily'] = getFontFamily();
        loadedValues['markerType'] = getMarkerType();
        loadedValues['connectionPathColor'] = getConnectionPathColor();
        loadedValues['connectionPathStroke'] = getConnectionPathStroke();
        loadedValues['canvasBackgroundColor'] = getCanvasBackgroundColor();
        loadedValues['textColor'] = getTextColor();
        
        setValues(loadedValues);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    })();
  }, [isMounted, isOpen, getCurrentTabNumberOfSections]);

  // 設定が読み込まれる前はレンダリングしない
  if (!isMounted) {
    return null;
  }

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
    setValues(prev => ({ ...prev, [field.key]: value }));
    setErrors(prev => ({ 
      ...prev, 
      [field.key]: !validateField(field, value)
    }));
  };

  const handleSave = async () => {
    let hasError = false;

    // 全フィールドの検証
    SETTINGS_TABS.forEach(tab => {
      tab.fields.forEach(field => {
        const value = values[field.key];
        if (!validateField(field, value)) {
          hasError = true;
          setErrors(prev => ({ ...prev, [field.key]: true }));
        }
      });
    });

    if (hasError) return;

    // APIKeyは非同期で保存
    const apiKeyValue = values['apiKey'];
    if (apiKeyValue !== undefined) {
      await setApiKey(String(apiKeyValue));
    }

    // 他の設定は同期的に保存
    const value = values['systemPromptTemplate'];
    if (value !== undefined) setSystemPromptTemplate(String(value));
    
    const modelType = values['modelType'];
    if (modelType !== undefined) setModelType(String(modelType));
    
    const prompt = values['prompt'];
    if (prompt !== undefined) setPrompt(String(prompt));
    
    // Update both global setting and current tab state for numberOfSections
    const numberOfSections = values['numberOfSections'];
    if (numberOfSections !== undefined) {
      const numValue = Number(numberOfSections);
      // Update global setting (for new tabs)
      setNumberOfSections(numValue);
      // Update current tab state
      updateCurrentTabNumberOfSections(numValue);
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
    if (canvasBackgroundColor !== undefined) setCanvasBackgroundColor(String(canvasBackgroundColor));
    
    const textColor = values['textColor'];
    if (textColor !== undefined) setTextColor(String(textColor));

    onClose();
  };

  return (
    <ModalWindow isOpen={isOpen} onClose={onClose}>
      <Typography variant="h6" gutterBottom>
        Preference
      </Typography>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        {SETTINGS_TABS.map(tab => (
          <Tab key={tab.id} label={tab.label} />
        ))}
      </Tabs>
      <Box sx={{ mt: 2, minHeight: 300 }}>
        {SETTINGS_TABS.map(tab => (
          activeTab === tab.id && (
            <Box key={tab.id}>
              {tab.fields.map(field => (
                <SettingField
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? field.defaultValue}
                  error={errors[field.key]}
                  onChange={(value) => handleValueChange(field, value)}
                />
              ))}
            </Box>
          )
        ))}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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
    </ModalWindow>
  );
};

export default SettingsModal;