-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  roles text[] not null default '{}',
  full_name text,
  avatar_url text,
  is_public boolean not null default false,
  profile_completion_pct int not null default 0,
  active_gig_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PROFILES
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  bio text,
  website_url text,
  location text,
  social_links jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- PORTFOLIO ITEMS
create table portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('youtube','vimeo','drive','website','social')),
  url text not null,
  title text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- AGENCY MEMBERS
create table agency_members (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references users(id) on delete cascade,
  editor_id uuid not null references users(id) on delete cascade,
  is_visible boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (agency_id, editor_id)
);

-- GIGS
create table gigs (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','filled','closed')),
  gig_type text not null check (gig_type in ('one_time','recurring')),
  recur_date date,
  applicant_count int not null default 0,
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  updated_at timestamptz not null default now()
);

-- APPLICATIONS
create table applications (
  id uuid primary key default uuid_generate_v4(),
  gig_id uuid not null references gigs(id) on delete cascade,
  applicant_id uuid not null references users(id) on delete cascade,
  stage text not null default 'applied' check (stage in ('applied','shortlisted','interviewing','hired')),
  cover_note text,
  is_withdrawn boolean not null default false,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gig_id, applicant_id)
);

-- THREADS
create table threads (
  id uuid primary key default uuid_generate_v4(),
  gig_id uuid not null references gigs(id) on delete cascade,
  client_id uuid not null references users(id) on delete cascade,
  applicant_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (gig_id, applicant_id)
);

-- MESSAGES
create table messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  sent_at timestamptz not null default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('application','shortlist','message','hired','gig_reopen')),
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS POLICIES
alter table users enable row level security;
create policy "Public profiles visible if is_public"
  on users for select using (is_public = true or auth.uid() = id);
create policy "Users update own row"
  on users for update using (auth.uid() = id);
create policy "Users insert own row"
  on users for insert with check (auth.uid() = id);

alter table profiles enable row level security;
create policy "Profile visible if user is public or owner"
  on profiles for select using (
    user_id = auth.uid() or
    exists (select 1 from users where id = profiles.user_id and is_public = true)
  );
create policy "Owner updates own profile"
  on profiles for update using (user_id = auth.uid());
create policy "Owner inserts own profile"
  on profiles for insert with check (user_id = auth.uid());

alter table portfolio_items enable row level security;
create policy "Portfolio visible if user is public or owner"
  on portfolio_items for select using (
    user_id = auth.uid() or
    exists (select 1 from users where id = portfolio_items.user_id and is_public = true)
  );
create policy "Owner manages own portfolio"
  on portfolio_items for all using (user_id = auth.uid());

alter table agency_members enable row level security;
create policy "Visible members are public"
  on agency_members for select using (
    is_visible = true or agency_id = auth.uid() or editor_id = auth.uid()
  );
create policy "Agency manages own members"
  on agency_members for all using (agency_id = auth.uid());

alter table gigs enable row level security;
create policy "Open gigs are public"
  on gigs for select using (status = 'open' or client_id = auth.uid());
create policy "Client inserts own gig"
  on gigs for insert with check (client_id = auth.uid());
create policy "Client updates own gig"
  on gigs for update using (client_id = auth.uid());
create policy "Client deletes own gig"
  on gigs for delete using (client_id = auth.uid());

alter table applications enable row level security;
create policy "Applicant sees own applications"
  on applications for select using (
    applicant_id = auth.uid() or
    exists (select 1 from gigs where id = applications.gig_id and client_id = auth.uid())
  );
create policy "Applicant inserts own application"
  on applications for insert with check (applicant_id = auth.uid());
create policy "Applicant withdraws own application"
  on applications for update using (applicant_id = auth.uid());
create policy "Client updates stage"
  on applications for update using (
    exists (select 1 from gigs where id = applications.gig_id and client_id = auth.uid())
  );

alter table threads enable row level security;
create policy "Thread participants only"
  on threads for select using (
    client_id = auth.uid() or applicant_id = auth.uid()
  );
create policy "Client creates thread"
  on threads for insert with check (client_id = auth.uid());

alter table messages enable row level security;
create policy "Thread participants read messages"
  on messages for select using (
    exists (
      select 1 from threads
      where id = messages.thread_id
      and (client_id = auth.uid() or applicant_id = auth.uid())
    )
  );
create policy "Thread participants send messages"
  on messages for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from threads
      where id = messages.thread_id
      and (client_id = auth.uid() or applicant_id = auth.uid())
    )
  );

alter table notifications enable row level security;
create policy "User sees own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "User updates own notifications"
  on notifications for update using (user_id = auth.uid());

-- Functions
create or replace function update_profile_completion()
returns trigger
language plpgsql
security definer
as $$
declare
  uid uuid;
  user_record record;
  video_portfolio_count int;
  other_portfolio_count int;
  social_count int;
  points int := 0;
begin
  if TG_TABLE_NAME = 'users' then
    uid := NEW.id;
  else
    uid := NEW.user_id;
  end if;

  select * into user_record from users where id = uid;
  
  if user_record.full_name is not null then points := points + 1; end if;
  if user_record.avatar_url is not null then points := points + 1; end if;
  
  select bio, website_url, location, social_links into user_record
  from profiles where user_id = uid;
  
  if user_record.bio is not null then points := points + 1; end if;
  if user_record.location is not null then points := points + 1; end if;
  if user_record.website_url is not null then points := points + 1; end if;
  
  social_count := (select count(*) from jsonb_object_keys(coalesce(user_record.social_links, '{}'::jsonb)));
  if social_count > 0 then points := points + 1; end if;
  
  select count(*) into video_portfolio_count
  from portfolio_items
  where user_id = uid
  and type in ('youtube', 'vimeo');
  if video_portfolio_count > 0 then points := points + 2; end if;
  
  select count(*) into other_portfolio_count
  from portfolio_items
  where user_id = uid
  and type not in ('youtube', 'vimeo');
  if other_portfolio_count > 0 then points := points + 1; end if;
  
  select is_public into user_record from users where id = uid;
  if user_record.is_public then points := points + 1; end if;
  
  update users set
    profile_completion_pct = (points * 100) / 10,
    updated_at = now()
  where id = uid;
  
  return NEW;
end;
$$;

-- Triggers
create trigger update_profile_completion_on_profile
  after insert or update on profiles
  for each row execute function update_profile_completion();

create trigger update_profile_completion_on_portfolio
  after insert or delete on portfolio_items
  for each row execute function update_profile_completion();

create trigger update_profile_completion_on_user
  after update of full_name, avatar_url, is_public on users
  for each row execute function update_profile_completion();

-- Updated at triggers
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on users
  for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger gigs_updated_at before update on gigs
  for each row execute function update_updated_at();
create trigger applications_updated_at before update on applications
  for each row execute function update_updated_at();
