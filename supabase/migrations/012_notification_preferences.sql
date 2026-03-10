-- Notification preferences per user
create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  digest_frequency text not null default 'weekly' check (digest_frequency in ('daily', 'weekly', 'off')),
  high_priority_alerts boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for lookups by user
create index if not exists idx_notification_preferences_user_id on notification_preferences (user_id);

-- Auto-update updated_at
create trigger notification_preferences_updated_at
  before update on notification_preferences
  for each row
  execute function update_updated_at();

-- Enable RLS
alter table notification_preferences enable row level security;

-- Users can read and update their own preferences
create policy "Users can view own notification preferences"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on notification_preferences for update
  using (auth.uid() = user_id);

-- Service role can read all (for cron digest sends)
create policy "Service role can read all notification preferences"
  on notification_preferences for select
  using (auth.role() = 'service_role');
