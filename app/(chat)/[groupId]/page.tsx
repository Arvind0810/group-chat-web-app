'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Phone, Video, Info, Users } from 'lucide-react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePresence } from '@/hooks/usePresence';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { ReplyPreview } from '@/components/chat/ReplyPreview';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { GroupInfoPanel } from '@/components/groups/GroupInfoPanel';
import { CallBanner } from '@/components/video/CallBanner';
import type { Message, Group } from '@/types';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { supabase, user } = useSupabase();
  const { messages, setMessages, loading, hasMore, loadMore, sendMessage, editMessage, deleteMessage } = useMessages(groupId);
  const { typingUsers, sendTyping } = useTypingIndicator(groupId);
  const { isOnline } = usePresence();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: string; userName: string } | null>(null);

  // Fetch group info
  useEffect(() => {
    const fetchGroup = async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (data) setGroup(data);
    };
    fetchGroup();
  }, [groupId, supabase]);

  // Update read receipt
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    supabase
      .from('read_receipts')
      .upsert({
        user_id: user.id,
        group_id: groupId,
        last_read_message_id: lastMessage.id.startsWith('temp-') ? null : lastMessage.id,
        last_read_at: new Date().toISOString(),
      })
      .then(() => {});
  }, [messages, user, groupId, supabase]);

  // Realtime messages
  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        // 1. Already have the real ID → ignore (handles double-fire)
        if (prev.some((m) => m.id === message.id)) return prev;

        // 2. Find an optimistic (temp-*) placeholder from the same sender.
        //    Match by sender + content + within a 15-second window so that
        //    identical messages sent at different times don't merge wrongly.
        const msgTime = new Date(message.created_at).getTime();
        const tempIdx = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.sender_id === message.sender_id &&
            m.content === message.content &&
            Math.abs(new Date(m.created_at).getTime() - msgTime) < 15_000
        );

        if (tempIdx !== -1) {
          // Replace the placeholder with the confirmed message in-place
          const next = [...prev];
          next[tempIdx] = message;
          return next;
        }

        // 3. Genuinely new message from another client → append
        return [...prev, message];
      });
    },
    [setMessages]
  );

  const handleMessageUpdate = useCallback(
    (message: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    },
    [setMessages]
  );

  useRealtimeMessages(groupId, handleNewMessage, handleMessageUpdate);

  // Listen for call broadcasts
  useEffect(() => {
    const channel = supabase
      .channel(`call:${groupId}`)
      .on('broadcast', { event: 'call_started' }, (payload) => {
        setActiveCall({
          type: payload.payload.callType,
          userName: payload.payload.userName,
        });
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        setActiveCall(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  const startCall = async (callType: 'voice' | 'video') => {
    if (!user) return;
    const displayName = user.email?.split('@')[0] || 'User';

    // Send system message
    await supabase.from('messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: `${displayName} started a ${callType} call`,
      message_type: 'system',
    });

    // Broadcast call started
    const channel = supabase.channel(`call:${groupId}`);
    await channel.send({
      type: 'broadcast',
      event: 'call_started',
      payload: { callType, userName: displayName, roomName: `group-${groupId}` },
    });

    router.push(`/${groupId}/call?type=${callType}`);
  };

  const handleSend = (content: string, replyToId?: string, messageType?: string, fileUrl?: string, fileName?: string, fileSize?: number) => {
    sendMessage(content, replyToId, messageType, fileUrl, fileName, fileSize);
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-zinc-900 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800 shrink-0">
          <div>
            <h2 className="font-semibold text-zinc-100">{group.name}</h2>
            {group.description && (
              <p className="text-xs text-zinc-400">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => startCall('voice')}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Voice Call"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => startCall('video')}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Video Call"
            >
              <Video size={18} />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Group Info"
            >
              <Info size={18} />
            </button>
          </div>
        </div>

        {/* Call banner */}
        {activeCall && (
          <CallBanner
            callType={activeCall.type}
            userName={activeCall.userName}
            onJoin={() => router.push(`/${groupId}/call?type=${activeCall.type}`)}
          />
        )}

        {/* Message list */}
        <MessageList
          messages={messages}
          currentUserId={user?.id || ''}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onReply={setReplyTo}
          onEdit={editMessage}
          onDelete={deleteMessage}
          isOnline={isOnline}
        />

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Reply preview */}
        {replyTo && (
          <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />
        )}

        {/* Message input */}
        <MessageInput
          groupId={groupId}
          onSend={handleSend}
          replyTo={
            replyTo
              ? {
                  id: replyTo.id,
                  senderName: replyTo.sender?.display_name || 'Unknown',
                  content: replyTo.content || '',
                }
              : null
          }
          onCancelReply={() => setReplyTo(null)}
          onTyping={sendTyping}
        />
      </div>

      {/* Group info panel */}
      {group && (
        <GroupInfoPanel
          group={group}
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          isOnline={isOnline}
        />
      )}
    </div>
  );
}
