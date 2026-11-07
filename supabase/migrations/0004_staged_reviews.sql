-- The single Actual/Staged switch (results_mode, added in 0003) is meant to
-- cover BOTH the star-rating Reviews and the purchase-decision numbers with
-- one flip — not just purchase decisions. This adds the five star-count
-- columns needed to stage Reviews the same way staged_buy_more/
-- staged_no_thanks already stage purchase decisions.
alter table staged_results
  add column if not exists staged_review_1 integer not null default 0 check (staged_review_1 >= 0),
  add column if not exists staged_review_2 integer not null default 0 check (staged_review_2 >= 0),
  add column if not exists staged_review_3 integer not null default 0 check (staged_review_3 >= 0),
  add column if not exists staged_review_4 integer not null default 0 check (staged_review_4 >= 0),
  add column if not exists staged_review_5 integer not null default 0 check (staged_review_5 >= 0);
