'use client';

import { useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import type { Message } from '@/types';

const MESSAGE_SELECT = '*, sender:users!messages_sender_id_fkey(*)';

async function fetchFullMessage(supabase: any, messageId: string): Promise<Message | null> {
  const { data } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('id', messageId)
    .single();

  if (!data) return null;

  // Fetch reply message separately if it exists
  if (data.reply_to) {
    const { data: replyData } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', data.reply_to)
      .single();
    data.reply_message = replyData || null;
  }

  return data;
}

export function useRealtimeMessages(
  groupId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void
) {
  const { supabase } = useSupabase();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const message = await fetchFullMessage(supabase, payload.new.id);
          if (message) onNewMessage(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const message = await fetchFullMessage(supabase, payload.new.id);
          if (message) onMessageUpdate(message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, onNewMessage, onMessageUpdate]);
}
