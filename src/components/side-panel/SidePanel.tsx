'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { ChatIcon } from '../icons/ChatIcon';
import { getPrompt, setPrompt } from '../../utils/storage/localStorageHelpers';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

type SidePanelTab = 'chat' | 'prompt';

export interface SidePanelProps {
  /** パネルの表示/非表示 */
  isOpen: boolean;
  /** パネルを閉じるコールバック */
  onClose: () => void;
  /** AI へメッセージを送信するコールバック。戻り値はアシスタントの返答 */
  onSendMessage: (message: string) => Promise<string | void>;
  /** AI が処理中かどうか */
  isLoading?: boolean;
  /** 外部から自動送信するメッセージ (設定時に自動的にチャットへ送信) */
  externalMessage?: string;
  /** コンテキスト（会話履歴）をクリアするコールバック */
  onClearContext?: () => void;
}

/** サイドパネルの幅 (px) */
const PANEL_WIDTH = 360;

// ---------------------------------------------------------------------------
// グローバルスタイル定義
// ---------------------------------------------------------------------------
// SidePanel内にのみスコープされたスピンアニメーション定義
if (typeof document !== 'undefined') {
  const styleId = 'side-panel-spin-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes side-panel-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

/**
 * VSCode ライクな AI アシスタントサイドパネル
 * - チャットタブ: AI との会話
 * - プロンプトタブ: ユーザープロンプトの編集
 */
export function SidePanel({
  isOpen,
  onClose,
  onSendMessage,
  isLoading = false,
  externalMessage,
  onClearContext,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // パネルオープン時にプロンプトを読み込む
  useEffect(() => {
    if (isOpen) {
      setPromptText(getPrompt());
      setIsSaved(false);
    }
  }, [isOpen]);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // チャットタブが開いたとき入力フィールドにフォーカス
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, activeTab]);

  // 外部メッセージを受け取ったとき自動送信
  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      handleSendMessage(externalMessage.trim());
    }
    // handleSendMessage は externalMessage 変化時のみ呼ぶ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const text = overrideText ?? inputText.trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      // 外部メッセージの場合は inputText をクリアしない
      if (!overrideText) setInputText('');

      try {
        const result = await onSendMessage(text);
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result || '操作を実行しました！',
          sender: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          sender: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [inputText, isLoading, onSendMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearContext = useCallback(() => {
    setMessages([]);
    onClearContext?.();
  }, [onClearContext]);

  const handleSavePrompt = useCallback(() => {
    setPrompt(promptText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [promptText]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: `${PANEL_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e5e7eb',
        background: '#f9fafb',
        zIndex: 200,
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChatIcon size={14} className="text-white" />
          </div>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1f2937' }}>
            AIアシスタント
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* 新しい会話（コンテキストクリア）ボタン */}
          <button
            onClick={handleClearContext}
            aria-label="新しい会話を開始"
            title="新しい会話を開始（コンテキストをクリア）"
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '2px 7px',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            +
          </button>
          <button
            onClick={onClose}
            aria-label="パネルを閉じる"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '4px 6px',
              borderRadius: '4px',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* タブバー */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          flexShrink: 0,
        }}
      >
        {(['chat', 'prompt'] as SidePanelTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: activeTab === tab ? '600' : '400',
              color: activeTab === tab ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            {tab === 'chat' ? 'チャット' : 'プロンプト'}
          </button>
        ))}
      </div>

      {/* ========== チャットタブ ========== */}
      {activeTab === 'chat' && (
        <>
          {/* メッセージ一覧 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#9ca3af',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  gap: '6px',
                  padding: '32px 16px',
                }}
              >
                <p style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                  複数の操作を組み合わせた指示も可能です
                </p>
                <p>🧩 例: 子要素「概要」「詳細」を追加して</p>
                <p>✏️ 例: テキストを「新しいタイトル」に変更して</p>
                <p>🔁 例: ルート要素に「テスト」を追加し、そこに移動して</p>
                <p>📝 例: 「概要」要素を選択して内容を「新しい概要」に変更</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      ...(message.sender === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#ffffff',
                            boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
                          }
                        : {
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            color: '#1f2937',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
                          }),
                    }}
                  >
                    {message.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#f9fafb',
                transition: 'all 0.2s ease',
                height: '36px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.boxShadow = 'none';
              }}
            />
            <IconButton
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              aria-label="送信"
              size="small"
              sx={{
                background:
                  !inputText.trim() || isLoading
                    ? 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                flexShrink: 0,
                opacity: !inputText.trim() || isLoading ? 0.6 : 1,
                '&:hover': {
                  background:
                    !isLoading && inputText.trim()
                      ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                      : 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
                },
              }}
            >
              {isLoading ? (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'side-panel-spin 1s linear infinite',
                  }}
                />
              ) : (
                <SendIcon style={{ fontSize: 16 }} />
              )}
            </IconButton>
          </div>
        </>
      )}

      {/* ========== プロンプトタブ ========== */}
      {activeTab === 'prompt' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            gap: '12px',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 4px',
              }}
            >
              ユーザープロンプト
            </p>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              AIへのリクエスト時に自動的に追加されるカスタム指示を設定します。
            </p>
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="例: 必ず日本語で回答してください。..."
            style={{
              flex: 1,
              resize: 'none',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />
          <button
            onClick={handleSavePrompt}
            style={{
              padding: '8px 16px',
              background: isSaved
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {isSaved ? '✓ 保存しました' : '保存する'}
          </button>
        </div>
      )}
    </div>
  );
}

export default SidePanel;
