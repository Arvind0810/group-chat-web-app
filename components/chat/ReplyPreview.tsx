'use client';

import { X } from 'lucide-react';
import type { Message } from '@/types';

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-t border-zinc-700">
      <div className="w-1 h-8 bg-indigo-500 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-indigo-400">
          Replying to {message.sender?.display_name || 'Unknown'}
        </p>
        <p className="text-xs text-zinc-400 truncate">
          {message.content?.slice(0, 100)}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
