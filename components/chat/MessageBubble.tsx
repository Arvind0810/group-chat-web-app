'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Reply, Copy, Pencil, Trash2, Download, ExternalLink } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn, formatFileSize } from '@/lib/utils';
import type { Message, User } from '@/types';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  showSender: boolean;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  isOnline?: boolean;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({
  message,
  currentUserId,
  showSender,
  onReply,
  onEdit,
  onDelete,
  isOnline,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const isOwn = message.sender_id === currentUserId;
  const isSystem = message.message_type === 'system';

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing]);

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={cn('group flex gap-3 px-4 py-0.5 hover:bg-zinc-800/30 transition-colors', showSender && 'mt-3')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar column */}
      <div className="w-10 shrink-0 flex justify-center">
        {showSender && message.sender ? (
          <Avatar
            name={message.sender.display_name}
            src={message.sender.avatar_url}
            size="sm"
            isOnline={isOnline}
          />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showSender && message.sender && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-zinc-200">
              {message.sender.display_name}
            </span>
            <span className="text-xs text-zinc-500">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
          </div>
        )}

        {/* Reply preview */}
        {message.reply_message && (
          <div className="mb-1 pl-3 border-l-2 border-indigo-500/50 text-xs text-zinc-400 truncate">
            <span className="font-medium text-zinc-300">
              {message.reply_message.sender?.display_name || 'Unknown'}
            </span>
            {': '}
            {message.reply_message.content?.slice(0, 100)}
          </div>
        )}

        {/* Message content */}
        {editing ? (
          <div className="flex flex-col gap-1">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSave();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full bg-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
            />
            <div className="flex gap-2 text-xs">
              <button onClick={handleEditSave} className="text-indigo-400 hover:text-indigo-300">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-300">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.message_type === 'text' && (
              <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">
                {linkify(message.content || '')}
                {message.is_edited && (
                  <span className="text-xs text-zinc-500 ml-1">(edited)</span>
                )}
              </p>
            )}

            {message.message_type === 'image' && message.file_url && (
              <div className="mt-1">
                <img
                  src={message.file_url}
                  alt={message.file_name || 'Image'}
                  className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                  onClick={() => window.open(message.file_url!, '_blank')}
                />
                {message.content && (
                  <p className="text-sm text-zinc-200 mt-1">{message.content}</p>
                )}
              </div>
            )}

            {message.message_type === 'file' && message.file_url && (
              <div className="mt-1 flex items-center gap-3 bg-zinc-700/50 rounded-lg px-3 py-2 max-w-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {message.file_name || 'File'}
                  </p>
                  {message.file_size && (
                    <p className="text-xs text-zinc-400">{formatFileSize(message.file_size)}</p>
                  )}
                </div>
                <a
                  href={message.file_url}
                  download={message.file_name}
                  className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <Download size={16} />
                </a>
              </div>
            )}

            {message.message_type === 'audio' && message.file_url && (
              <audio controls className="mt-1 max-w-xs" src={message.file_url} />
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !editing && (
        <div className="flex items-start gap-0.5 shrink-0 pt-0.5">
          {!showSender && (
            <span className="text-[10px] text-zinc-500 mr-1 pt-1">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
          )}
          <button
            onClick={() => onReply(message)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Reply"
          >
            <Reply size={14} />
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(message.content || '');
            }}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Copy"
          >
            <Copy size={14} />
          </button>
          {isOwn && message.message_type === 'text' && (
            <button
              onClick={() => {
                setEditContent(message.content || '');
                setEditing(true);
              }}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
