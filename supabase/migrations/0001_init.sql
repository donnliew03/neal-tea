-- NEAL TEA — initial schema
-- Security model: Row Level Security is enabled on every table. The ONLY
-- table with a public (anon) SELECT policy is `sessions`, because the
-- public projector and student app need to react live to stage changes via
-- Supabase Realtime. Every other table has NO policies at all for
-- anon/authenticated roles — all reads and writes go through Netlify
-- Functions using the service-role key, which bypasses RLS by design.
-- This means a student or a curious visitor cannot read another
-- participant's review, spin balance, or purchase decision directly from
-- the database, no matter what the frontend code does.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  stage text not null default 'welcome'
    check (stage in ('welcome','reviews_open','reviews_reveal','spin_open','spin_reveal','ethical_reveal')),
  reveal_step smallint not null default 0 check (reveal_step between 0 and 3)
);

-- Only one session may be active at a time (simplifies /join: there is
-- always exactly one "the current classroom session", if any).
create unique index if not exists one_active_session
  on sessions ((is_active))
  where is_active;

alter table sessions enable row level security;

drop policy if exists "public can read sessions" on sessions;
create policy "public can read sessions"
  on sessions for select
  using (true);

-- ---------------------------------------------------------------------
-- participants
-- ---------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  joined_at timestamptz not null default now(),
  session_token_hash text not null
);

create index if not exists participants_session_idx on participants(session_id);

alter table participants enable row level security;
-- No anon/authenticated policies: only service role (Netlify Functions) may
-- read or write participant rows. The public nickname marquee is served by
-- a Netlify Function that returns nicknames only, never tokens.

-- ---------------------------------------------------------------------
-- game_config
-- ---------------------------------------------------------------------
create table if not exists game_config (
  session_id uuid primary key references sessions(id) on delete cascade,
  prizes jsonb not null,
  free_spins_per_participant smallint not null default 2 check (free_spins_per_participant between 1 and 5),
  purchase_offer_enabled boolean not null default true,
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table game_config enable row level security;
-- No public policies — prize odds must never be directly readable from the
-- client in a way that bypasses the "VIEW PRIZE ODDS" function, which only
-- returns odds, never lets the odds be fetched before they're meant to be
-- visible. (The spec explicitly wants odds inspectable, just via a
-- controlled function, not an open table read.)

-- ---------------------------------------------------------------------
-- spin_balances
-- ---------------------------------------------------------------------
create table if not exists spin_balances (
  participant_id uuid primary key references participants(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  free_spins_remaining smallint not null default 0,
  extra_spins_remaining smallint not null default 0,
  total_spins_used smallint not null default 0
);

alter table spin_balances enable row level security;

-- ---------------------------------------------------------------------
-- spins
-- ---------------------------------------------------------------------
create table if not exists spins (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  prize_id text not null,
  spin_type text not null check (spin_type in ('free','extra')),
  request_id text not null,
  created_at timestamptz not null default now(),
  unique (participant_id, request_id)
);

create index if not exists spins_session_idx on spins(session_id);

alter table spins enable row level security;

-- ---------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists reviews_session_idx on reviews(session_id);

alter table reviews enable row level security;

-- ---------------------------------------------------------------------
-- purchase_decisions
-- ---------------------------------------------------------------------
create table if not exists purchase_decisions (
  participant_id uuid primary key references participants(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  decision text not null check (decision in ('buy_more','no_thanks')),
  extra_spin_granted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists purchase_session_idx on purchase_decisions(session_id);

alter table purchase_decisions enable row level security;

-- ---------------------------------------------------------------------
-- staged_results (admin-entered illustrative marketing figures)
-- ---------------------------------------------------------------------
create table if not exists staged_results (
  session_id uuid primary key references sessions(id) on delete cascade,
  staged_buy_more int not null default 0,
  staged_no_thanks int not null default 0,
  updated_at timestamptz not null default now()
);

alter table staged_results enable row level security;

-- ---------------------------------------------------------------------
-- helper: how many participants have been "offered" the extra-spin prompt.
-- A participant is "offered" once their free spins reach zero AND the
-- purchase-offer feature is enabled. We derive this from spin_balances at
-- query time inside the Netlify Function rather than storing it, to avoid
-- another place state can drift.
-- ---------------------------------------------------------------------
