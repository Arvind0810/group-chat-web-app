'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { CallRoom } from '@/components/video/CallRoom';

export default function CallPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const callType = (searchParams.get('type') || 'voice') as 'voice' | 'video';
  const { supabase, user } = useSupabase();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const getToken = async () => {
      if (!user) return;

      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, userId: user.id }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to get call token');
          return;
        }

        const data = await res.json();
        setToken(data.token);
      } catch {
        setError('Failed to connect to call');
      }
    };

    getToken();
  }, [groupId, user, supabase]);

  const handleDisconnect = async () => {
    // Broadcast call ended
    const channel = supabase.channel(`call:${groupId}`);
    await channel.send({
      type: 'broadcast',
      event: 'call_ended',
      payload: {},
    });

    router.push(`/${groupId}`);
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 gap-4 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push(`/${groupId}`)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 text-indigo-400 hover:text-indigo-300 touch-manipulation"
        >
          <ArrowLeft size={16} />
          Back to chat
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 gap-3">
        <Loader2 className="animate-spin text-indigo-400" size={36} />
        <p className="text-zinc-400 text-sm">Connecting to call...</p>
      </div>
    );
  }

  return (
    /*
     * `min-h-0` on the outer flex column prevents the flex child from
     * growing past the viewport. Without it, `flex-1` has no upper bound
     * on height and LiveKit content overflows the screen.
     */
    <div className="flex-1 flex flex-col bg-zinc-900 min-h-0 overflow-hidden">
      {/* Header — fixed height, never scrolls away */}
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-zinc-700 bg-zinc-800 shrink-0">
        <button
          onClick={handleDisconnect}
          className="p-2.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation"
          aria-label="Leave call"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-medium text-zinc-200">
          {callType === 'video' ? '📹 Video' : '🎙️ Voice'} Call
        </span>
      </div>

      {/*
       * `min-h-0` + `flex-1` creates a bounded box that fills remaining
       * space after the header. CallRoom's inner div then fills exactly this.
       */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CallRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
          callType={callType}
          onDisconnected={handleDisconnect}
        />
      </div>
    </div>
  );
}
