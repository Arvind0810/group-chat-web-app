import { MessageSquare } from 'lucide-react';

export default function ChatDefaultPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-900">
      <div className="text-center text-zinc-500">
        <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">Select a conversation to start chatting</p>
        <p className="text-sm mt-1">Or create a new group to get started</p>
      </div>
    </div>
  );
}
