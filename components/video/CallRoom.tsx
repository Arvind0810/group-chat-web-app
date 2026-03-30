'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
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

export function CallRoom({ token, serverUrl, callType, onDisconnected }: CallRoomProps) {
  if (!token) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={callType === 'video'}
      audio={true}
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      style={{ height: '100%' }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
