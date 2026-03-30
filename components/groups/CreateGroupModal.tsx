'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MemberSelector } from './MemberSelector';
import type { User } from '@/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { supabase, user } = useSupabase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError('');

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
        is_direct_message: false,
      })
      .select()
      .single();

    if (groupError || !group) {
      setError(groupError?.message || 'Failed to create group');
      setLoading(false);
      return;
    }

    // Add creator as admin
    const memberInserts = [
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...members.map((m) => ({ group_id: group.id, user_id: m.id, role: 'member' })),
    ];

    await supabase.from('group_members').insert(memberInserts);

    // Send system message
    await supabase.from('messages').insert({
      group_id: group.id,
      sender_id: user.id,
      content: `${user.email?.split('@')[0]} created the group`,
      message_type: 'system',
    });

    // Init read receipt
    await supabase.from('read_receipts').upsert({
      user_id: user.id,
      group_id: group.id,
      last_read_at: new Date().toISOString(),
    });

    setName('');
    setDescription('');
    setMembers([]);
    setLoading(false);
    onCreated();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g., Team Chat"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="What's this group about?"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Add Members</label>
          <MemberSelector
            selectedMembers={members}
            onAdd={(u) => setMembers((prev) => [...prev, u])}
            onRemove={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
