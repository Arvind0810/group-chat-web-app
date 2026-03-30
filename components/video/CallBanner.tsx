'use client';

import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CallBannerProps {
  callType: string;
  userName: string;
  onJoin: () => void;
}

export function CallBanner({ callType, userName, onJoin }: CallBannerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-green-600/20 border-b border-green-600/30">
      <div className="flex items-center gap-2">
        <Phone size={16} className="text-green-400" />
        <span className="text-sm text-green-300">
          {userName} started a {callType} call
        </span>
      </div>
      <Button size="sm" onClick={onJoin}>
        Join Call
      </Button>
    </div>
  );
}
