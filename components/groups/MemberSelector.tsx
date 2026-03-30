'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types';

interface MemberSelectorProps {
  selectedMembers: User[];
  onAdd: (user: User) => void;
  onRemove: (userId: string) => void;
  excludeIds?: string[];
}

export function MemberSelector({ selectedMembers, onAdd, onRemove, excludeIds = [] }: MemberSelectorProps) {
  const { supabase, user } = useSupabase();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const selectedRef = useRef(selectedMembers);
  const excludeRef = useRef(excludeIds);
  selectedRef.current = selectedMembers;
  excludeRef.current = excludeIds;

  const doSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      const allExcluded = [
        ...excludeRef.current,
        user?.id || '',
        ...selectedRef.current.map((m) => m.id),
      ];

      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
        .not('id', 'in', `(${allExcluded.join(',')})`)
        .limit(10);

      setResults(data || []);
      setLoading(false);
    },
    [supabase, user]
  );

  const handleInputChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 500);
  };

  const handleAdd = (u: User) => {
    onAdd(u);
    setSearch('');
    setResults([]);
  };

  return (
    <div>
      {/* Selected members */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedMembers.map((member) => (
            <span
              key={member.id}
              className="flex items-center gap-1 bg-indigo-600/20 text-indigo-300 text-xs px-2 py-1 rounded-full"
            >
              {member.display_name}
              <button onClick={() => onRemove(member.id)} className="hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-9 pr-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => handleAdd(u)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Avatar name={u.display_name} src={u.avatar_url} size="sm" />
              <div className="text-left">
                <p className="text-sm text-zinc-200">{u.display_name}</p>
                <p className="text-xs text-zinc-400">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-xs text-zinc-400 mt-2">Searching...</p>
      )}
    </div>
  );
}
