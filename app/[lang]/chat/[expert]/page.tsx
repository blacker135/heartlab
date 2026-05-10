// ============================================================
// /[lang]/chat/[expert]/page.tsx — 对话页核心组件
// ============================================================
// 客户端组件，负责整个对话页的编排：
//   - 解析 URL 参数（lang、expert）和查询参数（c=conversation_id、q=预填问题）
//   - 管理专家切换面板的开关状态
//   - 管理消息列表状态
//   - handleSend：发送消息 → POST /api/chat → SSE 流式读取
//   - handleSwitchExpert：切换专家 → POST /api/chat/switch
//   - 布局：ChatSidebar | ChatHeader + MessageList + ChatInput | ExpertSwitchPanel
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ExpertSwitchPanel } from '@/components/chat/ExpertSwitchPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

/** 消息项类型 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ChatPageClient — 对话页主组件
 * 组合所有聊天子组件，管理对话状态和数据流
 */
export default function ChatPageClient() {
  // ---------- URL 参数 ----------
  const params = useParams<{ lang: string; expert: string }>();
  const searchParams = useSearchParams();

  // ---------- UI 状态 ----------
  const [expertPanelOpen, setExpertPanelOpen] = useState(false);
  const [currentExpert, setCurrentExpert] = useState(params.expert || 'liam');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get('c'),
  );

  // ---------- 处理 URL 预填问题 ----------
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      handleSend(q);
    }
    // 仅在组件挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 发送消息 ----------
  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      // 立即将用户消息添加到列表（乐观更新）
      const userMsg: ChatMessage = { role: 'user', content: message };
      setMessages((prev) => [...prev, userMsg]);

      try {
        // 调用 SSE 流式对话 API
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            expert: currentExpert,
            message,
            language: params.lang,
          }),
        });

        if (!res.ok) {
          // API 错误处理 — 显示错误消息
          const errData = await res.json().catch(() => ({
            error: 'Unknown error',
          }));
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: errData.error || 'Something went wrong. Please try again.',
            },
          ]);
          return;
        }

        // 读取 SSE 流
        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Failed to connect to chat service.',
            },
          ]);
          return;
        }

        const decoder = new TextDecoder();
        let aiContent = '';

        // 立即添加一个空的 AI 消息占位（用于流式更新）
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        // 循环读取 SSE 流数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6); // 去掉 "data: " 前缀
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                aiContent += parsed.content;
                // 更新最后一条 AI 消息的内容
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: aiContent,
                  };
                  return updated;
                });
              }
              if (parsed.error) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: `Error: ${parsed.error}`,
                  };
                  return updated;
                });
              }
            } catch {
              // 跳过无法解析的行
            }
          }
        }
      } catch (err) {
        console.error('Chat send error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Network error. Please check your connection and try again.',
          },
        ]);
      }
    },
    [conversationId, currentExpert, params.lang],
  );

  // ---------- 切换专家 ----------
  const handleSwitchExpert = async (newExpert: string) => {
    // 关闭面板
    setExpertPanelOpen(false);

    // 如果没有对话 ID，直接切换并清空消息（新对话）
    if (!conversationId) {
      setCurrentExpert(newExpert);
      setMessages([]);
      return;
    }

    // 有对话 ID → 调用切换 API 获取过渡消息
    try {
      const res = await fetch('/api/chat/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          new_expert: newExpert,
          language: params.lang,
        }),
      });

      if (!res.ok) {
        // 降级：直接切换专家
        setCurrentExpert(newExpert);
        return;
      }

      const data = await res.json();
      setCurrentExpert(newExpert);

      // 添加 AI 过渡消息
      if (data.content) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.content },
        ]);
      }
    } catch (err) {
      console.error('Expert switch error:', err);
      setCurrentExpert(newExpert);
    }
  };

  // ---------- 渲染 ----------
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧：对话列表侧边栏 */}
      <ChatSidebar />

      {/* 右侧：主聊天区域 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 顶部导航栏 */}
        <ChatHeader
          onOpenExpertPanel={() => setExpertPanelOpen(true)}
          expert={currentExpert}
        />

        {/* 消息列表（含欢迎卡片） */}
        <MessageList
          messages={messages}
          expert={currentExpert}
          onSuggestionClick={(text) => handleSend(text)}
        />

        {/* 底部输入区域 */}
        <ChatInput onSend={handleSend} />
      </div>

      {/* 专家切换浮动面板（条件渲染） */}
      {expertPanelOpen && (
        <ExpertSwitchPanel
          onSelect={handleSwitchExpert}
          onClose={() => setExpertPanelOpen(false)}
          currentExpert={currentExpert}
          lang={params.lang}
        />
      )}
    </div>
  );
}
