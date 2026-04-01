'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Reply, Copy, Pencil, Trash2, Download, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn, formatFileSize } from '@/lib/utils';
import type { Message } from '@/types';

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
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 opacity-90 hover:opacity-100"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
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
  const [copied, setCopied] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = message.sender_id === currentUserId;
  const isPending = message.id.startsWith('temp-');

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing]);

  // ── System message ──────────────────────────────────────────────────────
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-zinc-500 bg-zinc-800/60 px-3 py-1 rounded-full">
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Bubble content ───────────────────────────────────────────────────────
  const bubbleContent = editing ? (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <textarea
        ref={editRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full bg-black/20 text-inherit rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/30"
        rows={2}
      />
      <div className="flex gap-3 text-xs justify-end">
        <button onClick={handleEditSave} className="opacity-90 hover:opacity-100 font-medium">Save</button>
        <button onClick={() => setEditing(false)} className="opacity-60 hover:opacity-100">Cancel</button>
      </div>
    </div>
  ) : (
    <>
      {/* Reply quote */}
      {message.reply_message && (
        <div className={cn(
          'mb-1.5 px-2 py-1 rounded text-xs border-l-2 opacity-80',
          isOwn ? 'bg-white/10 border-white/50' : 'bg-zinc-600/50 border-indigo-400'
        )}>
          <span className="font-semibold block">
            {message.reply_message.sender?.display_name || 'Unknown'}
          </span>
          <span className="line-clamp-1">
            {message.reply_message.content?.slice(0, 80)}
          </span>
        </div>
      )}

      {message.message_type === 'text' && (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {linkify(message.content || '')}
        </p>
      )}

      {message.message_type === 'image' && message.file_url && (
        <div>
          <img
            src={message.file_url}
            alt={message.file_name || 'Image'}
            className="max-w-[260px] max-h-[260px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover block"
            onClick={() => window.open(message.file_url!, '_blank')}
          />
          {message.content && (
            <p className="text-sm mt-1">{message.content}</p>
          )}
        </div>
      )}

      {message.message_type === 'file' && message.file_url && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2',
          isOwn ? 'bg-white/10' : 'bg-zinc-600/50'
        )}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.file_name || 'File'}</p>
            {message.file_size && (
              <p className="text-xs opacity-60">{formatFileSize(message.file_size)}</p>
            )}
          </div>
          <a href={message.file_url} download={message.file_name} className="opacity-70 hover:opacity-100">
            <Download size={16} />
          </a>
        </div>
      )}

      {message.message_type === 'audio' && message.file_url && (
        <audio controls className="max-w-[220px]" src={message.file_url} />
      )}

      {/* Timestamp + edited + pending */}
      <div className={cn(
        'flex items-center gap-1 mt-0.5',
        isOwn ? 'justify-end' : 'justify-start'
      )}>
        <span className="text-[10px] opacity-50">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
        {message.is_edited && (
          <span className="text-[10px] opacity-50">· edited</span>
        )}
        {isOwn && (
          <span className="text-[10px] opacity-50">
            {isPending ? '🕐' : '✓'}
          </span>
        )}
      </div>
    </>
  );

  // ── Action buttons (shown on hover) ─────────────────────────────────────
  const actionButtons = showActions && !editing && (
    <div className={cn(
      'flex items-center gap-0.5 self-end mb-5',
      isOwn ? 'order-first mr-1' : 'order-last ml-1'
    )}>
      <button
        onClick={() => onReply(message)}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        title="Reply"
      >
        <Reply size={13} />
      </button>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
      {isOwn && message.message_type === 'text' && (
        <button
          onClick={() => { setEditContent(message.content || ''); setEditing(true); }}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          title="Edit"
        >
          <Pencil size={13} />
        </button>
      )}
      {isOwn && (
        <button
          onClick={() => onDelete(message.id)}
          className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );

  // ── Own message (right-aligned) ──────────────────────────────────────────
  if (isOwn) {
    return (
      <div className={cn('flex justify-end items-end gap-1 px-3 py-0.5', showSender && 'mt-2')}>
        {actionButtons}
        <div
          className={cn(
            'max-w-[70%] sm:max-w-[60%]',
            isPending && 'opacity-70'
          )}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div className="bg-indigo-600 text-white px-3 py-2 rounded-2xl rounded-br-sm shadow-sm">
            {bubbleContent}
          </div>
        </div>
      </div>
    );
  }

  // ── Other user's message (left-aligned) ─────────────────────────────────
  return (
    <div className={cn('flex items-end gap-2 px-3 py-0.5', showSender && 'mt-2')}>
      {/* Avatar — shown only for first message in a batch */}
      <div className="w-8 shrink-0 self-end">
        {showSender && message.sender ? (
          <Avatar
            name={message.sender.display_name}
            src={message.sender.avatar_url}
            size="sm"
            isOnline={isOnline}
          />
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div
        className="max-w-[70%] sm:max-w-[60%]"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {showSender && message.sender && (
          <p className="text-xs font-semibold text-zinc-300 mb-1 ml-1">
            {message.sender.display_name}
          </p>
        )}
        <div className="bg-zinc-700 text-zinc-100 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
          {bubbleContent}
        </div>
      </div>

      {actionButtons}
    </div>
  );
}
