'use client';

import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';

export function useAuth() {
  const { supabase, user, loading } = useSupabase();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return { user, loading, signOut };
}
