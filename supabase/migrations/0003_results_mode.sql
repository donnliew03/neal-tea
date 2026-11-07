-- Adds a single switch to game_config: whether the publicly-revealed
-- purchase-decision numbers (shown at the spin_reveal stage and again
-- during ethical_reveal) come from the real class data, or from the
-- admin-entered "staged" numbers in staged_results. Replaces the earlier
-- "show both side by side" design with a simple either/or.
alter table game_config
  add column if not exists results_mode text not null default 'actual'
  check (results_mode in ('actual', 'staged'));
