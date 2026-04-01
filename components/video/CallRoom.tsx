'use client';

import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Loader2 } from 'lucide-react';

interface CallRoomProps {
  token: string;
  serverUrl: string;
  callType: 'voice' | 'video';
  onDisconnected: () => void;
}

/**
 * Custom layout built from LiveKit primitives instead of <VideoConference>.
 *
 * WHY: VideoConference wraps GridLayout in a pagination layer (updatePages)
 * that throws "Element not part of the array" when a track placeholder is
 * removed during a publish/unpublish transition. Using GridLayout directly
 * bypasses that pagination logic and eliminates the error.
 *
 * Must be rendered as a child of <LiveKitRoom> so useTracks has context.
 */
function CallLayout({ callType }: { callType: 'voice' | 'video' }) {
  const tracks = useTracks(
    callType === 'video'
      ? [
          { source: Track.Source.Camera, withPlaceholder: true },
          { source: Track.Source.ScreenShare, withPlaceholder: false },
        ]
      : [
          // Voice: show participant tiles (with mic placeholder so avatars appear)
          { source: Track.Source.Microphone, withPlaceholder: true },
        ],
    { onlySubscribed: false }
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Grid grows to fill all remaining height; min-height:0 is critical */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <GridLayout
          tracks={tracks}
          style={{ height: '100%', width: '100%' }}
        >
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Control bar is fixed-height and never scrolls */}
      <ControlBar style={{ flexShrink: 0 }} />
    </div>
  );
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
        <CallLayout callType={callType} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
