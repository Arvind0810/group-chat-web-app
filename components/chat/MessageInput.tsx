'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Send, Paperclip, X, FileIcon, ImageIcon } from 'lucide-react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { formatFileSize } from '@/lib/utils';

interface MessageInputProps {
  groupId: string;
  onSend: (content: string, replyTo?: string, messageType?: string, fileUrl?: string, fileName?: string, fileSize?: number) => void;
  replyTo?: { id: string; senderName: string; content: string } | null;
  onCancelReply?: () => void;
  onTyping: () => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  preview?: string;
}

export function MessageInput({ groupId, onSend, replyTo, onCancelReply, onTyping, disabled }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { supabase } = useSupabase();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; size: number } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${groupId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-files')
      .upload(path, file);

    if (error) return null;

    const { data } = supabase.storage.from('chat-files').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name, size: file.size };
  };

  const handleSend = async () => {
    const trimmedContent = content.trim();

    if (files.length > 0) {
      setUploading(true);
      for (const { file } of files) {
        const result = await uploadFile(file);
        if (result) {
          const isImage = file.type.startsWith('image/');
          onSend(
            trimmedContent || '',
            replyTo?.id,
            isImage ? 'image' : 'file',
            result.url,
            result.name,
            result.size
          );
        }
      }
      setFiles([]);
      setUploading(false);
    } else if (trimmedContent) {
      onSend(trimmedContent, replyTo?.id);
    }

    setContent('');
    onCancelReply?.();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping();
    // Auto-resize
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
  };

  return (
    <div {...getRootProps()} className="border-t border-zinc-700 bg-zinc-800">
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-indigo-600/20 border-2 border-dashed border-indigo-500 flex items-center justify-center">
          <p className="text-indigo-300 text-lg font-medium">Drop files here</p>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
          {files.map((f, i) => (
            <div key={i} className="relative shrink-0 bg-zinc-700 rounded-lg p-2 pr-8">
              {f.preview ? (
                <img src={f.preview} alt={f.file.name} className="w-16 h-16 rounded object-cover" />
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center text-zinc-400">
                  <FileIcon size={20} />
                  <span className="text-[10px] mt-1 truncate max-w-full">{f.file.name.split('.').pop()}</span>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 p-0.5 bg-zinc-600 rounded-full text-zinc-300 hover:text-white"
              >
                <X size={12} />
              </button>
              <p className="text-[10px] text-zinc-400 mt-1 truncate max-w-[64px]">{f.file.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <button
          onClick={open}
          className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || uploading}
          className="flex-1 bg-zinc-700 text-zinc-100 placeholder-zinc-400 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 max-h-40 min-h-[40px]"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={disabled || uploading || (!content.trim() && files.length === 0)}
          className="p-2 text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 transition-colors shrink-0"
          title="Send"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
