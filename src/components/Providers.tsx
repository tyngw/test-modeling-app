// components/Providers.tsx
'use client';

import React from 'react';
import { ReactNode } from 'react';
import { TabsProvider } from '../context/TabsContext';
import { ToastProvider } from '../context/ToastContext';
import { SuggestionProvider } from '../context/SuggestionContext';
import ChatAssistant from './ChatAssistant';
import { useChatAssistant } from '../hooks/useChatAssistant';
import { useTabManagement } from '../hooks/useTabManagement';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SuggestionProvider>
        <TabsProvider>
          {children}
          <ChatAssistantWrapper />
        </TabsProvider>
      </SuggestionProvider>
    </ToastProvider>
  );
}

function ChatAssistantWrapper() {
  const { currentTab, dispatch } = useTabManagement();

  // 最新の状態を取得する関数
  const getLatestState = React.useCallback(() => {
    return currentTab;
  }, [currentTab]);

  const { handleChatMessage, isLoading: isChatLoading } = useChatAssistant({
    currentTab,
    dispatch,
    getLatestState,
  });
  const [isChatVisible, setIsChatVisible] = React.useState(false);
  const [externalMessage, setExternalMessage] = React.useState<string>('');

  const toggleChat = React.useCallback(() => {
    setIsChatVisible((prev) => !prev);
  }, []);

  const handleExternalMessageProcessed = React.useCallback(() => {
    setExternalMessage('');
  }, []);

  // グローバルでAIアシスタントメッセージを受信
  React.useEffect(() => {
    const handleAIAssistantMessage = (event: CustomEvent) => {
      const message = event.detail.message;
      setIsChatVisible(true); // チャットウィンドウを開く
      setExternalMessage(message); // メッセージを設定
    };

    window.addEventListener('aiAssistantMessage', handleAIAssistantMessage as EventListener);
    return () => {
      window.removeEventListener('aiAssistantMessage', handleAIAssistantMessage as EventListener);
    };
  }, []);

  return (
    <ChatAssistant
      onSendMessage={handleChatMessage}
      isLoading={isChatLoading}
      isVisible={isChatVisible}
      onToggle={toggleChat}
      externalMessage={externalMessage}
      onExternalMessageProcessed={handleExternalMessageProcessed}
    />
  );
}
