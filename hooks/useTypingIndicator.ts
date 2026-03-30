'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';

interface TypingUser {
  userId: string;
  displayName: string;
}

export function useTypingIndicator(groupId: string) {
  const { supabase, user } = useSupabase();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  const sendTyping = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;

    const channel = supabase.channel(`typing:${groupId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, displayName: '' },
    });
  }, [groupId, supabase, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`typing:${groupId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingUser;
        if (data.userId === user.id) return;

        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.userId === data.userId);
          if (!exists) return [...prev, data];
          return prev;
        });

        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, user]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { typingUsers, sendTyping };
}
