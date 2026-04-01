'use client';

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2 } from 'lucide-react';

interface CallRoomProps {
  token: string;
  serverUrl: string;
  callType: 'voice' | 'video';
  onDisconnected: () => void;
}

export function CallRoom({ token, serverUrl, callType, onDisconnected }: CallRoomProps) {
  if (!token) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    /*
     * Outer div is the hard boundary: position-relative + overflow-hidden
     * ensures LiveKit never escapes beyond the space we allocate.
     * `h-full w-full` inherits the constrained dimensions from the parent.
     */
    <div className="relative w-full h-full overflow-hidden">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={callType === 'video'}
        audio={true}
        onDisconnected={onDisconnected}
        data-lk-theme="default"
        style={{ height: '100%', width: '100%' }}
      >
        {/*
         * VideoConference renders a grid + control bar internally.
         * We wrap it in a flex-col container that is also overflow-hidden
         * so the grid never grows past the parent.
         */}
        <div
          style={{ height: '100%', width: '100%' }}
          className="flex flex-col overflow-hidden"
        >
          <VideoConference />
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
