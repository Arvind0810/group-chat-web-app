'use client';

import { useEffect, useState, useRef } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function usePresence() {
  const { supabase, user } = useSupabase();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // Remove any previous channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('online-presence', {
      config: { presence: { key: user.id } },
    });

    channelRef.current = channel;

    // Register callbacks BEFORE subscribing
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = new Set(Object.keys(state));
      setOnlineUsers(online);
    });

    // Now subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });

        await supabase
          .from('users')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
    });

    return () => {
      supabase
        .from('users')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        });
    };
  }, [user, supabase]);

  return { onlineUsers, isOnline: (userId: string) => onlineUsers.has(userId) };
}
