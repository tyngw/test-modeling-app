'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  getPrompt,
  setPrompt,
  getSystemPromptTemplate,
  setSystemPromptTemplate,
} from '../../utils/storage/localStorageHelpers';

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
      @keyframes slide-down-popover {
        from {
          opacity: 0;
          transform: translateY(-8px);
          max-height: 0;
        }
        to {
          opacity: 1;
          transform: translateY(0);
          max-height: 500px;
        }
      }
      @keyframes slide-up-popover {
        from {
          opacity: 1;
          transform: translateY(0);
          max-height: 500px;
        }
        to {
          opacity: 0;
          transform: translateY(-8px);
          max-height: 0;
        }
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
  const [systemPromptText, setSystemPromptText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  // アコーディオン状態: 'user' | 'system' | null（null=両方閉じている）
  const [openAccordion, setOpenAccordion] = useState<'user' | 'system' | null>('user');
  const [panelWidth, setPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // コンテキストクリア時のレース対策: クリアのたびにインクリメント
  const clearCountRef = useRef(0);

  // パネルオープン時にプロンプトを読み込む
  useEffect(() => {
    if (isOpen) {
      setPromptText(getPrompt());
      setSystemPromptText(getSystemPromptTemplate());
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

      // このリクエスト開始時点のクリアカウントを記録
      const capturedClearCount = clearCountRef.current;

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
        // コンテキストがクリアされていたらレスポンスを破棄
        if (clearCountRef.current !== capturedClearCount) return;
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result || '操作を実行しました！',
          sender: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        if (clearCountRef.current !== capturedClearCount) return;
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
    // IME変換確定（isComposing=true）の場合はsubmitしない
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearContext = useCallback(() => {
    clearCountRef.current += 1;
    setMessages([]);
    onClearContext?.();
  }, [onClearContext]);

  const handleSavePrompt = useCallback(() => {
    setPrompt(promptText);
    setSystemPromptTemplate(systemPromptText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [promptText, systemPromptText]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(200, Math.min(newWidth, 800)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100vh',
        width: `${panelWidth}px`,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e5e7eb',
        background: '#f9fafb',
        zIndex: 200,
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.08)',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* リサイズハンドル */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          background: isResizing ? '#3b82f6' : 'transparent',
          transition: 'background 0.2s',
          zIndex: 210,
        }}
      />
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
          <AutoAwesomeIcon
            sx={{
              fontSize: 20,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          />
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
            padding: '12px 16px',
            gap: '0',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* ユーザープロンプトアコーディオンヘッダー */}
          <button
            onClick={() => setOpenAccordion(openAccordion === 'user' ? null : 'user')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
              }}
            >
              ユーザープロンプト
            </p>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                transition: 'transform 0.2s ease',
                transform: openAccordion === 'user' ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          {/* ユーザープロンプト入力欄（アニメーション付き） */}
          <div
            style={{
              display: openAccordion === 'user' ? 'flex' : 'none',
              flexDirection: 'column',
              gap: '4px',
              flex: openAccordion === 'user' ? 1 : 0,
              animation:
                openAccordion === 'user'
                  ? 'slide-down-popover 0.3s ease-out forwards'
                  : 'slide-up-popover 0.3s ease-out forwards',
              overflow: 'hidden',
              paddingTop: '8px',
            }}
          >
            <p
              style={{
                fontSize: '0.7rem',
                color: '#9ca3af',
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              AIへのリクエスト時に自動的に追加されるカスタム指示を設定します。
            </p>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="例: 必ず日本語で回答してください。..."
              style={{
                flex: 1,
                resize: 'none',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.5',
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
          </div>

          {/* システムプロンプトアコーディオンヘッダー */}
          <button
            onClick={() => setOpenAccordion(openAccordion === 'system' ? null : 'system')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
              }}
            >
              システムプロンプト
            </p>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                transition: 'transform 0.2s ease',
                transform: openAccordion === 'system' ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </button>

          {/* システムプロンプト入力欄（アニメーション付き） */}
          <div
            style={{
              display: openAccordion === 'system' ? 'flex' : 'none',
              flexDirection: 'column',
              gap: '4px',
              flex: openAccordion === 'system' ? 1 : 0,
              animation:
                openAccordion === 'system'
                  ? 'slide-down-popover 0.3s ease-out forwards'
                  : 'slide-up-popover 0.3s ease-out forwards',
              overflow: 'hidden',
              paddingTop: '8px',
            }}
          >
            <p
              style={{
                fontSize: '0.7rem',
                color: '#9ca3af',
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              AIモデルのシステムレベルの動作を定義するテンプレートを設定します。
            </p>
            <textarea
              value={systemPromptText}
              onChange={(e) => setSystemPromptText(e.target.value)}
              placeholder="例: あなたは開発を支援するAIアシスタントです。..."
              style={{
                flex: 1,
                resize: 'none',
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.5',
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
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSavePrompt}
            style={{
              padding: '6px 12px',
              background: isSaved
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              marginTop: '8px',
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
