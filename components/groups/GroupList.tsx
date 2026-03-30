'use client';

import { format, isToday, isYesterday } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { GroupWithLastMessage } from '@/types';

interface GroupListProps {
  groups: GroupWithLastMessage[];
  loading: boolean;
  currentGroupId?: string;
  onSelect: (groupId: string) => void;
  isOnline: (userId: string) => boolean;
  currentUserId: string;
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MM/dd/yy');
}

export function GroupList({ groups, loading, currentGroupId, onSelect, isOnline, currentUserId }: GroupListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-zinc-700" />
            <div className="flex-1">
              <div className="h-4 bg-zinc-700 rounded w-24 mb-1" />
              <div className="h-3 bg-zinc-700 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        <p>No conversations yet</p>
        <p className="mt-1">Create a group to start chatting</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {groups.map((group) => {
        const isActive = group.id === currentGroupId;

        // For DMs, show the other person's name/avatar
        let displayName = group.name;
        let avatarUrl = group.avatar_url;
        let otherUserId: string | null = null;

        if (group.is_direct_message && group.members) {
          const otherMember = group.members.find((m) => m.user_id !== currentUserId);
          if (otherMember?.users) {
            displayName = otherMember.users.display_name;
            avatarUrl = otherMember.users.avatar_url || null;
            otherUserId = otherMember.user_id;
          }
        }

        const lastMessagePreview = group.last_message
          ? group.last_message.message_type === 'image'
            ? '📷 Photo'
            : group.last_message.message_type === 'file'
            ? '📎 File'
            : group.last_message.content?.slice(0, 40) || ''
          : 'No messages yet';

        return (
          <button
            key={group.id}
            onClick={() => onSelect(group.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
              isActive ? 'bg-zinc-700' : 'hover:bg-zinc-700/50'
            )}
          >
            <Avatar
              name={displayName}
              src={avatarUrl}
              size="md"
              isOnline={otherUserId ? isOnline(otherUserId) : undefined}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-sm truncate',
                    group.unread_count && group.unread_count > 0
                      ? 'font-semibold text-zinc-100'
                      : 'text-zinc-300'
                  )}
                >
                  {displayName}
                </span>
                {group.last_message && (
                  <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                    {formatTimestamp(group.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400 truncate">{lastMessagePreview}</p>
                {group.unread_count && group.unread_count > 0 && (
                  <Badge count={group.unread_count} />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
