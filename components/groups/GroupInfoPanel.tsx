'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Crown, LogOut, Trash2 } from 'lucide-react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { MemberSelector } from './MemberSelector';
import type { User, GroupMember, Group } from '@/types';

interface GroupInfoPanelProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  isOnline: (userId: string) => boolean;
}

export function GroupInfoPanel({ group, isOpen, onClose, isOnline }: GroupInfoPanelProps) {
  const { supabase, user } = useSupabase();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<User[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      const { data } = await supabase
        .from('group_members')
        .select('*, users(*)')
        .eq('group_id', group.id);

      if (data) {
        setMembers(data);
        const currentMember = data.find((m) => m.user_id === user?.id);
        setIsAdmin(currentMember?.role === 'admin');
      }
    };

    fetchMembers();
  }, [isOpen, group.id, supabase, user]);

  const handleAddMembers = async () => {
    for (const newMember of selectedNewMembers) {
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: newMember.id,
        role: 'member',
      });
      await supabase.from('messages').insert({
        group_id: group.id,
        sender_id: user?.id,
        content: `${newMember.display_name} was added to the group`,
        message_type: 'system',
      });
    }
    setSelectedNewMembers([]);
    setShowAddMember(false);
    // Refresh members
    const { data } = await supabase
      .from('group_members')
      .select('*, users(*)')
      .eq('group_id', group.id);
    if (data) setMembers(data);
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', memberId);

    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  };

  const handleUpdateName = async () => {
    if (groupName.trim() && groupName !== group.name) {
      await supabase
        .from('groups')
        .update({ name: groupName.trim() })
        .eq('id', group.id);
    }
    setEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-zinc-700 bg-zinc-800 flex flex-col h-full shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <h3 className="font-semibold text-zinc-100">Group Info</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Group name */}
        <div>
          {editing ? (
            <div className="flex gap-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 bg-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
              />
              <Button size="sm" onClick={handleUpdateName}>Save</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-zinc-100">{group.name}</h4>
              {isAdmin && (
                <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-200">
                  Edit
                </button>
              )}
            </div>
          )}
          {group.description && (
            <p className="text-sm text-zinc-400 mt-1">{group.description}</p>
          )}
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-zinc-300">
              Members ({members.length})
            </h5>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <UserPlus size={14} />
                Add
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="mb-3 p-2 bg-zinc-700/50 rounded-lg">
              <MemberSelector
                selectedMembers={selectedNewMembers}
                onAdd={(u) => setSelectedNewMembers((prev) => [...prev, u])}
                onRemove={(id) => setSelectedNewMembers((prev) => prev.filter((m) => m.id !== id))}
                excludeIds={members.map((m) => m.user_id)}
              />
              {selectedNewMembers.length > 0 && (
                <Button size="sm" className="mt-2 w-full" onClick={handleAddMembers}>
                  Add {selectedNewMembers.length} member(s)
                </Button>
              )}
            </div>
          )}

          <div className="space-y-1">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-700/50">
                <Avatar
                  name={member.users?.display_name || ''}
                  src={member.users?.avatar_url}
                  size="sm"
                  isOnline={isOnline(member.user_id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">
                    {member.users?.display_name}
                    {member.user_id === user?.id && (
                      <span className="text-zinc-500 ml-1">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {member.role === 'admin' && (
                      <span className="flex items-center gap-0.5 text-amber-400">
                        <Crown size={10} /> Admin
                      </span>
                    )}
                  </p>
                </div>
                {isAdmin && member.user_id !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="p-1 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
