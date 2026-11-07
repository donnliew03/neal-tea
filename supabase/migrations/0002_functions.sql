-- Atomic server-side operations. These run as SECURITY DEFINER so they can
-- be called by the service role from Netlify Functions with the guarantee
-- that "check balance, decrement, record outcome" happens as one atomic
-- unit even under concurrent requests from the same participant (double
-- clicks, network retries) or 50 participants at once.

-- ---------------------------------------------------------------------
-- consume_spin: idempotent, atomic "spend one spin allowance and record
-- the outcome chosen by the caller" (the caller — a Netlify Function —
-- picks the prize using a cryptographically secure weighted draw BEFORE
-- calling this; this function's job is only to make sure the balance check
-- and the recording can never be split by a race condition or a retry).
-- ---------------------------------------------------------------------
create or replace function consume_spin(
  p_participant_id uuid,
  p_session_id uuid,
  p_spin_type text,
  p_request_id text,
  p_prize_id text
) returns table (
  prize_id text,
  free_spins_remaining smallint,
  extra_spins_remaining smallint,
  replayed boolean
)
language plpgsql
security definer
as $$
declare
  existing record;
  bal record;
begin
  -- Idempotency: if this exact request already produced a spin, return the
  -- original outcome instead of spinning again. This is what protects
  -- against double-clicks and network-retry duplicates.
  select s.prize_id into existing
  from spins s
  where s.participant_id = p_participant_id and s.request_id = p_request_id;

  if found then
    select sb.free_spins_remaining, sb.extra_spins_remaining
    into bal
    from spin_balances sb
    where sb.participant_id = p_participant_id;

    return query select existing.prize_id, bal.free_spins_remaining, bal.extra_spins_remaining, true;
    return;
  end if;

  -- Lock this participant's balance row so concurrent requests from the
  -- same participant are strictly serialized.
  select * into bal
  from spin_balances
  where participant_id = p_participant_id
  for update;

  if not found then
    raise exception 'no_spin_balance' using errcode = 'P0001';
  end if;

  if p_spin_type = 'free' then
    if bal.free_spins_remaining <= 0 then
      raise exception 'no_free_spins' using errcode = 'P0002';
    end if;
    update spin_balances
      set free_spins_remaining = free_spins_remaining - 1,
          total_spins_used = total_spins_used + 1
      where participant_id = p_participant_id
      returning free_spins_remaining, extra_spins_remaining into bal;
  elsif p_spin_type = 'extra' then
    if bal.extra_spins_remaining <= 0 then
      raise exception 'no_extra_spins' using errcode = 'P0003';
    end if;
    update spin_balances
      set extra_spins_remaining = extra_spins_remaining - 1,
          total_spins_used = total_spins_used + 1
      where participant_id = p_participant_id
      returning free_spins_remaining, extra_spins_remaining into bal;
  else
    raise exception 'invalid_spin_type' using errcode = 'P0004';
  end if;

  insert into spins (participant_id, session_id, prize_id, spin_type, request_id)
  values (p_participant_id, p_session_id, p_prize_id, p_spin_type, p_request_id);

  return query select p_prize_id, bal.free_spins_remaining, bal.extra_spins_remaining, false;
end;
$$;

-- ---------------------------------------------------------------------
-- record_purchase_decision: atomic "record the decision once, and if it is
-- BUY MORE, grant exactly one extra spin" — idempotent on participant_id
-- (primary key of purchase_decisions), so a retry can never grant a second
-- extra spin.
-- ---------------------------------------------------------------------
create or replace function record_purchase_decision(
  p_participant_id uuid,
  p_session_id uuid,
  p_decision text
) returns table (
  decision text,
  extra_spin_granted boolean,
  already_recorded boolean
)
language plpgsql
security definer
as $$
declare
  grant_spin boolean := (p_decision = 'buy_more');
  inserted_decision text;
  inserted_granted boolean;
begin
  insert into purchase_decisions (participant_id, session_id, decision, extra_spin_granted)
  values (p_participant_id, p_session_id, p_decision, grant_spin)
  on conflict (participant_id) do nothing
  returning purchase_decisions.decision, purchase_decisions.extra_spin_granted
  into inserted_decision, inserted_granted;

  if found then
    if grant_spin then
      update spin_balances
        set extra_spins_remaining = extra_spins_remaining + 1
        where participant_id = p_participant_id;
    end if;
    return query select inserted_decision, inserted_granted, false;
    return;
  end if;

  -- Already recorded earlier — return the original decision, grant nothing
  -- new.
  select pd.decision, pd.extra_spin_granted
  into inserted_decision, inserted_granted
  from purchase_decisions pd
  where pd.participant_id = p_participant_id;

  return query select inserted_decision, inserted_granted, true;
end;
$$;
