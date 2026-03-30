'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import type { Message } from '@/types';

const PAGE_SIZE = 50;

const MESSAGE_SELECT = '*, sender:users!messages_sender_id_fkey(*)';

async function attachReplies(supabase: any, messages: any[]): Promise<Message[]> {
  const replyIds = messages
    .filter((m) => m.reply_to)
    .map((m) => m.reply_to);

  if (replyIds.length === 0) return messages;

  const { data: replyMessages } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .in('id', replyIds);

  const replyMap = new Map<string, Message>();
  if (replyMessages) {
    for (const rm of replyMessages) {
      replyMap.set(rm.id, rm);
    }
  }

  return messages.map((m) => ({
    ...m,
    reply_message: m.reply_to ? replyMap.get(m.reply_to) || null : null,
  }));
}

export function useMessages(groupId: string) {
  const { supabase, user } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const oldestTimestamp = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (data) {
      const withReplies = await attachReplies(supabase, data);
      const sorted = withReplies.reverse();
      setMessages(sorted);
      if (sorted.length > 0) {
        oldestTimestamp.current = sorted[0].created_at;
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [groupId, user, supabase]);

  const loadMore = useCallback(async () => {
    if (!oldestTimestamp.current || !hasMore) return;

    const { data } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('group_id', groupId)
      .lt('created_at', oldestTimestamp.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (data) {
      const withReplies = await attachReplies(supabase, data);
      const sorted = withReplies.reverse();
      setMessages((prev) => [...sorted, ...prev]);
      if (sorted.length > 0) {
        oldestTimestamp.current = sorted[0].created_at;
      }
      setHasMore(data.length === PAGE_SIZE);
    }
  }, [groupId, hasMore, supabase]);

  const sendMessage = useCallback(
    async (content: string, replyTo?: string, messageType: string = 'text', fileUrl?: string, fileName?: string, fileSize?: number) => {
      if (!user) return;
      setSending(true);

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        group_id: groupId,
        sender_id: user.id,
        content,
        message_type: messageType as Message['message_type'],
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        reply_to: replyTo || null,
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: undefined,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const { error } = await supabase.from('messages').insert({
        group_id: groupId,
        sender_id: user.id,
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        reply_to: replyTo,
      });

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }

      // Update group's updated_at
      await supabase
        .from('groups')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', groupId);

      setSending(false);
    },
    [groupId, user, supabase]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
          )
        );
      }
    },
    [supabase]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ content: 'This message was deleted', message_type: 'system' })
        .eq('id', messageId);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: 'This message was deleted', message_type: 'system' }
              : m
          )
        );
      }
    },
    [supabase]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, setMessages, loading, hasMore, loadMore, sendMessage, editMessage, deleteMessage, sending };
}
