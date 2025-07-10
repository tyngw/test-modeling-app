// components/Providers.tsx
'use client';

import React from 'react';
import { ReactNode } from 'react';
import { TabsProvider } from '../context/TabsContext';
import { ToastProvider } from '../context/ToastContext';
import ChatAssistant from './ChatAssistant';
import { useChatAssistant } from '../hooks/useChatAssistant';
import { useTabManagement } from '../hooks/useTabManagement';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <TabsProvider>
        {children}
        <ChatAssistantWrapper />
      </TabsProvider>
    </ToastProvider>
  );
}

function ChatAssistantWrapper() {
  const { currentTab, dispatch } = useTabManagement();
  const { handleChatMessage, isLoading: isChatLoading } = useChatAssistant({
    currentTab,
    dispatch,
  });
  const [isChatVisible, setIsChatVisible] = React.useState(false);

  const toggleChat = React.useCallback(() => {
    setIsChatVisible((prev) => !prev);
  }, []);

  return (
    <ChatAssistant
      onSendMessage={handleChatMessage}
      isLoading={isChatLoading}
      isVisible={isChatVisible}
      onToggle={toggleChat}
    />
  );
}
