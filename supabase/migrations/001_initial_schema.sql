-- ============================================
-- Users table
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  is_online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view all users"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

-- ============================================
-- Groups table
-- ============================================
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  created_by uuid references public.users(id) on delete set null,
  is_direct_message boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.groups enable row level security;

create policy "Users can view groups they are members of"
  on public.groups for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  to authenticated
  with check (true);

create policy "Group admins can update groups"
  on public.groups for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
    )
  );

create policy "Group admins can delete groups"
  on public.groups for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
      and group_members.role = 'admin'
    )
  );

-- ============================================
-- Group members table
-- ============================================
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text check (role in ('admin', 'member')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Users can view members of their groups"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Group admins can insert members"
  on public.group_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
    )
    or exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.created_by = auth.uid()
    )
  );

create policy "Group admins can update members"
  on public.group_members for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
    )
  );

create policy "Group admins can remove members or members can leave"
  on public.group_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'admin'
    )
  );

-- ============================================
-- Messages table
-- ============================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete set null,
  content text,
  message_type text check (message_type in ('text', 'image', 'file', 'system', 'audio')) default 'text',
  file_url text,
  file_name text,
  file_size bigint,
  reply_to uuid references public.messages(id) on delete set null,
  is_edited boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages in their groups"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their groups"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.group_members
      where group_members.group_id = messages.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can update their own messages"
  on public.messages for update
  to authenticated
  using (auth.uid() = sender_id);

create policy "Users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = sender_id);

-- ============================================
-- Read receipts table
-- ============================================
create table public.read_receipts (
  user_id uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz default now(),
  primary key (user_id, group_id)
);

alter table public.read_receipts enable row level security;

create policy "Users can view read receipts in their groups"
  on public.read_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = read_receipts.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can upsert their own read receipts"
  on public.read_receipts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own read receipts"
  on public.read_receipts for update
  to authenticated
  using (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
create index idx_messages_group_id on public.messages(group_id);
create index idx_messages_sender_id on public.messages(sender_id);
create index idx_messages_created_at on public.messages(created_at desc);
create index idx_messages_reply_to on public.messages(reply_to);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_read_receipts_group_id on public.read_receipts(group_id);
create index idx_users_email on public.users(email);
create index idx_users_is_online on public.users(is_online);

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.groups;

-- ============================================
-- Storage bucket for chat files
-- ============================================
insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-files');

create policy "Anyone can view chat files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-files');

create policy "Users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);
