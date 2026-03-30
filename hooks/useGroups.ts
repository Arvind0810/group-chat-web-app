'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import type { GroupWithLastMessage, Message } from '@/types';

export function useGroups() {
  const { supabase, user } = useSupabase();
  const [groups, setGroups] = useState<GroupWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (!memberGroups || memberGroups.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberGroups.map((m) => m.group_id);

    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (!groupsData) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // Fetch last message for each group
    const groupsWithMessages: GroupWithLastMessage[] = await Promise.all(
      groupsData.map(async (group) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*, sender:users!messages_sender_id_fkey(*)')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch members for DMs
        let members;
        if (group.is_direct_message) {
          const { data } = await supabase
            .from('group_members')
            .select('*, users(*)')
            .eq('group_id', group.id);
          members = data || undefined;
        }

        // Fetch unread count
        const { data: receipt } = await supabase
          .from('read_receipts')
          .select('last_read_at')
          .eq('user_id', user.id)
          .eq('group_id', group.id)
          .single();

        let unread_count = 0;
        if (receipt?.last_read_at) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gt('created_at', receipt.last_read_at)
            .neq('sender_id', user.id);
          unread_count = count || 0;
        }

        return {
          ...group,
          last_message: messages?.[0] || undefined,
          unread_count,
          members: members || undefined,
        };
      })
    );

    // Sort by last message time
    groupsWithMessages.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at;
      const bTime = b.last_message?.created_at || b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setGroups(groupsWithMessages);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Subscribe to new messages across all groups for unread updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchGroups]);

  return { groups, loading, refetch: fetchGroups };
}
