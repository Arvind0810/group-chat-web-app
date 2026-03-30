'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  isOnline: (userId: string) => boolean;
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  isOnline,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const prevMessageCount = useRef(messages.length);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if user is at bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 100;

    // Load more when scrolled to top
    if (scrollTop < 50 && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Auto-scroll on new messages if at bottom
  useEffect(() => {
    if (messages.length > prevMessageCount.current && isAtBottom.current) {
      scrollToBottom();
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [loading]);

  const shouldShowSender = (message: Message, index: number) => {
    if (message.message_type === 'system') return false;
    if (index === 0) return true;
    const prev = messages[index - 1];
    if (prev.message_type === 'system') return true;
    if (prev.sender_id !== message.sender_id) return true;
    // Show sender if more than 5 minutes apart
    const diff = new Date(message.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff > 5 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-zinc-500">
          <p>No messages yet. Say hello!</p>
        </div>
      )}

      <div className="py-2">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            showSender={shouldShowSender(message, index)}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            isOnline={message.sender_id ? isOnline(message.sender_id) : false}
          />
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
