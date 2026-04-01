'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Plus, LogOut, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { usePresence } from '@/hooks/usePresence';
import { GroupList } from '@/components/groups/GroupList';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { groups, loading: groupsLoading, refetch } = useGroups();
  const { isOnline } = usePresence();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="h-screen flex bg-zinc-900 dark:bg-zinc-900 text-zinc-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-30 w-72 bg-zinc-800 dark:bg-zinc-800 border-r border-zinc-700 flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-0'
        )}
      >
        {/* Sidebar header */}
        <div className="p-3 border-b border-zinc-700 flex items-center gap-3">
          <Avatar name={displayName} size="sm" isOnline={true} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            title="New Group"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Group list */}
        <div className="flex-1 overflow-y-auto">
          <GroupList
            groups={groups}
            loading={groupsLoading}
            currentGroupId={pathname.split('/')[1]}
            onSelect={(groupId) => {
              router.push(`/${groupId}`);
              setSidebarOpen(false);
            }}
            isOnline={isOnline}
            currentUserId={user?.id || ''}
          />
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-zinc-700">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors w-full p-2 rounded-lg hover:bg-zinc-700"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile header — only shown outside call pages */}
        <div className="md:hidden flex items-center p-3 border-b border-zinc-700 bg-zinc-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 touch-manipulation"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <h1 className="ml-2 text-lg font-semibold">Chat</h1>
        </div>
        {children}
      </main>

      {/* Create group modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={() => {
          setShowCreateGroup(false);
          refetch();
        }}
      />
    </div>
  );
}
