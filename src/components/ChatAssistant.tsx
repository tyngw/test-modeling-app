import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatIcon } from './icons/ChatIcon';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatAssistantProps {
  onSendMessage: (message: string) => Promise<string | void>;
  isLoading?: boolean;
  isVisible?: boolean;
  onToggle?: () => void;
}

/**
 * HubSpotのようなチャットアシスタントコンポーネント
 * 右下に固定表示され、クリックでチャット画面を開閉できる
 */
export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  onSendMessage,
  isLoading = false,
  isVisible = false,
  onToggle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  // Portal用のマウントポイントを作成
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalRoot(document.body);

      // スピンアニメーションのCSSを追加
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // チャット画面が開いたときに入力フィールドにフォーカス＆一番下までスクロール
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
      // メッセージエリアを一番下までスクロール
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [isVisible]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // 必要なデバッグログのみ残し、不要なconsole出力を削除
    // ユーザー送信内容は重要な操作なので残す
    // console.log('[DEBUG] ChatAssistant - User message:', userMessage.text)
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      // AI送信開始のみ残す（障害時のトラブルシュート用）
      // console.log('[DEBUG] ChatAssistant - Sending message to AI...')
      await onSendMessage(userMessage.text);
      // AI操作完了ログは削除
      // console.log('[DEBUG] ChatAssistant - AI operation completed successfully');

      // 成功メッセージを追加
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: '操作を実行しました！',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // エラー時の詳細は残す（障害解析用）
      // console.error('[DEBUG] ChatAssistant - AI operation failed:', error)
      // console.error('[DEBUG] ChatAssistant - Error details:', {
      //   message: error instanceof Error ? error.message : '不明なエラー',
      //   stack: error instanceof Error ? error.stack : undefined,
      //   userInput: userMessage.text,
      //   timestamp: new Date().toISOString(),
      // })

      // エラーメッセージを追加
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const chatAssistantContent = (
    <>
      {/* チャットアイコン - 常に固定位置 */}
      <div
        className="fixed bottom-4 right-4 z-50"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 50,
        }}
      >
        <button
          onClick={onToggle}
          aria-label="チャットアシスタントを開く"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#e5e7eb', // さらに明るいグレー
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)', // 影も少し明るく
            outline: 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#d1d5db'; // 少し暗いグレー
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow =
              '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow =
              '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)';
          }}
        >
          <ChatIcon size={24} />
        </button>
      </div>

      {/* チャットウィンドウ */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            zIndex: 9000,
            padding: '20px',
            // backgroundColor: 'rgba(0, 0, 0, 0.3)', // ← 削除
          }}
          onClick={onToggle}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7ef 100%)', // 少し暗めのグラデーションに調整
              borderRadius: '16px',
              width: '400px',
              height: '600px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `
                0 10px 15px -3px rgba(0, 0, 0, 0.1),
                0 4px 6px -2px rgba(0, 0, 0, 0.05),
                0 0 0 1px rgba(255, 255, 255, 0.1)
              `,
              border: '2px solid #d1d5db',
              transform: 'translateY(0) scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              marginRight: '20px',
              marginBottom: '100px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 24,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <ChatIcon size={16} className="text-white" />
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  height: '32px',
                }}
              >
                AIアシスタント
              </div>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={onToggle}
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                background: '#1f293715',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '1.2em',
                color: '#1f2937',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#1f293725';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#1f293715';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ×
            </button>

            {/* メッセージエリア */}
            <div
              style={{
                position: 'relative',
                maxHeight: 'calc(600px - 140px)', // ヘッダー・入力エリアを除く
                marginTop: '72px',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0 24px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#1f293740 transparent',
              }}
            >
              <div style={{ padding: '16px 0', minHeight: '300px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                    <div
                      style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                      }}
                    >
                      <p style={{ fontWeight: '500', marginBottom: '8px' }}>
                        選択した要素に対して操作を指示してください
                      </p>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <p>🧩 例: 子要素「hoge」を追加して</p>
                        <p>✏️ 例: テキストを「タイトル」に変更して</p>
                        <p>🔀 例: 「hoge」の下に移動して</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            ...(message.sender === 'user'
                              ? {
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: '#ffffff',
                                  marginLeft: '16px',
                                }
                              : {
                                  backgroundColor: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  color: '#1f2937',
                                  marginRight: '16px',
                                }),
                          }}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 入力エリア */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 12px', // 余白を減らす
                borderTop: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)',
                borderRadius: '0 0 16px 16px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '4px 8px', // 余白をさらに減らす
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    minHeight: '28px', // 高さをさらに低く
                    height: '28px',
                    lineHeight: '18px',
                    boxSizing: 'border-box',
                    display: 'block',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                />
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                  aria-label="送信"
                  size="small"
                  sx={{
                    background: isLoading
                      ? '#9ca3af'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.1)',
                    opacity: !inputText.trim() || isLoading ? 0.5 : 1,
                    width: '28px',
                    height: '28px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      background:
                        !isLoading && inputText.trim()
                          ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                          : '#9ca3af',
                      boxShadow: '0 4px 8px 0 rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid #ffffff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <span style={{ color: '#fff', fontSize: '0.8rem' }}></span>
                    </div>
                  ) : (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px',
                      }}
                    >
                      <SendIcon style={{ fontSize: 12 }} htmlColor="#fff" />
                    </span>
                  )}
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Portal を使用して body に直接マウント
  if (!portalRoot) {
    return null;
  }

  return createPortal(chatAssistantContent, portalRoot);
};

export default ChatAssistant;
