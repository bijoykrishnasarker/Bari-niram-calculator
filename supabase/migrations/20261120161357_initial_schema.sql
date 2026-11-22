begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.payment_status as enum ('pending', 'approved', 'rejected');
create type public.access_tier as enum ('free', 'premium');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.device_bindings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  device_hash char(64) not null,
  device_label text,
  active boolean not null default true,
  bound_at timestamptz not null default now(),
  reset_at timestamptz,
  reset_by uuid references auth.users (id),
  constraint device_hash_is_sha256 check (device_hash ~ '^[0-9a-f]{64}$')
);

create unique index one_account_per_active_device
  on public.device_bindings (device_hash)
  where active;

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_bdt smallint not null,
  sender_last4 char(4) not null,
  status public.payment_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  review_note text,
  constraint premium_price_is_99_bdt check (amount_bdt = 99),
  constraint sender_last4_is_four_digits check (sender_last4 ~ '^[0-9]{4}$'),
  constraint review_note_length check (char_length(review_note) <= 500)
);

create unique index one_pending_payment_per_user
  on public.payment_requests (user_id)
  where status = 'pending';

create index payment_review_queue
  on public.payment_requests (status, submitted_at);

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan public.access_tier not null default 'premium',
  lifetime boolean not null default true,
  premium_since timestamptz not null default now(),
  granted_by_payment_id uuid not null unique references public.payment_requests (id),
  constraint premium_entitlement_only check (plan = 'premium' and lifetime)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  input jsonb not null,
  result jsonb not null,
  rule_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_name_length check (char_length(name) between 1 and 80)
);

create index projects_by_user_and_date
  on public.projects (user_id, created_at desc);

create table public.guide_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_bn text not null,
  body_bn text[] not null,
  sort_order smallint not null unique,
  access_tier public.access_tier not null,
  updated_at timestamptz not null default now(),
  constraint guide_slug_format check (slug ~ '^[a-z0-9-]+$')
);

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.device_bindings enable row level security;
alter table public.payment_requests enable row level security;
alter table public.entitlements enable row level security;
alter table public.projects enable row level security;
alter table public.guide_sections enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.device_bindings from public, anon, authenticated;
revoke all on table public.payment_requests from public, anon, authenticated;
revoke all on table public.entitlements from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.guide_sections from public, anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.admin_users to service_role;
grant all on table public.device_bindings to service_role;
grant all on table public.payment_requests to service_role;
grant all on table public.entitlements to service_role;
grant all on table public.projects to service_role;
grant all on table public.guide_sections to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "device_bindings_select_own"
  on public.device_bindings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "payment_requests_select_own"
  on public.payment_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "payment_requests_insert_own"
  on public.payment_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and amount_bdt = 99
    and status = 'pending'
  );

create policy "entitlements_select_own"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "projects_select_own"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "premium_users_insert_projects"
  on public.projects for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.plan = 'premium'
        and e.lifetime
    )
  );

create policy "premium_users_update_projects"
  on public.projects for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.plan = 'premium'
        and e.lifetime
    )
  )
  with check ((select auth.uid()) = user_id);

create policy "premium_users_delete_projects"
  on public.projects for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.plan = 'premium'
        and e.lifetime
    )
  );

create policy "free_guide_sections_are_public"
  on public.guide_sections for select
  to anon, authenticated
  using (access_tier = 'free');

create policy "premium_guide_sections_need_entitlement"
  on public.guide_sections for select
  to authenticated
  using (
    access_tier = 'free'
    or exists (
      select 1
      from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.plan = 'premium'
        and e.lifetime
    )
  );

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.approve_payment_request(
  p_payment_id uuid,
  p_reviewer_id uuid,
  p_review_note text default null
)
returns public.payment_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  approved_payment public.payment_requests;
begin
  update public.payment_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      review_note = p_review_note
  where id = p_payment_id
    and status = 'pending'
  returning * into approved_payment;

  if approved_payment.id is null then
    raise exception 'Pending payment request not found'
      using errcode = 'P0002';
  end if;

  insert into public.entitlements (
    user_id,
    plan,
    lifetime,
    premium_since,
    granted_by_payment_id
  )
  values (
    approved_payment.user_id,
    'premium',
    true,
    now(),
    approved_payment.id
  )
  on conflict (user_id) do update
  set plan = 'premium',
      lifetime = true,
      premium_since = least(
        public.entitlements.premium_since,
        excluded.premium_since
      );

  return approved_payment;
end;
$$;

revoke all on function public.approve_payment_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.approve_payment_request(uuid, uuid, text)
  to service_role;

insert into public.guide_sections
  (slug, title_bn, body_bn, sort_order, access_tier)
values
  (
    'plan-first',
    'সঠিক প্ল্যানিং দিয়ে শুরু করুন',
    array[
      'কাজ শুরুর আগে পুরো ডিজাইন ও বাজেট চূড়ান্ত করুন।',
      'মাঝপথে পরিবর্তন করলে অতিরিক্ত খরচ হয়।',
      'পেশাদার পরিকল্পনা ব্যবহার করুন।'
    ],
    10,
    'free'
  ),
  (
    'simple-design',
    'সিম্পল ডিজাইন বেছে নিন',
    array[
      'জটিল ডিজাইন খরচ বাড়ায়।',
      'রেক্ট্যাঙ্গুলার বা স্কয়ার ডিজাইন সাধারণত সাশ্রয়ী।',
      'কম দেয়াল মানে কম খরচ।'
    ],
    20,
    'free'
  ),
  (
    'right-season',
    'সঠিক সময়ে কাজ শুরু করুন',
    array[
      'বর্ষা এড়িয়ে চলুন।',
      'শুষ্ক মৌসুমে কাজ দ্রুত ও কম খরচে হয়।'
    ],
    30,
    'free'
  ),
  (
    'budget-control',
    'বাজেট কন্ট্রোল রাখুন',
    array[
      'শুরুতেই বাজেট নির্ধারণ করুন।',
      'প্রতিদিন বা সাপ্তাহিক খরচ ট্র্যাক করুন।',
      'অপ্রয়োজনীয় আইটেম বাদ দিন।'
    ],
    40,
    'premium'
  ),
  (
    'smart-materials',
    'স্মার্ট ম্যাটেরিয়াল নির্বাচন',
    array[
      'সবকিছু হাই-এন্ড নেওয়া প্রয়োজন নেই।',
      'ভালো মানের স্থানীয় উপকরণ বেছে নিন।',
      'স্ট্রাকচারাল উপকরণের মানে কখনো আপস করবেন না।'
    ],
    50,
    'premium'
  ),
  (
    'skilled-team',
    'দক্ষ টিম নিন',
    array[
      'অভিজ্ঞ মিস্ত্রি কম ভুল ও কম অপচয় করে।',
      'খুব সস্তা শ্রমে সময় ও মোট খরচ বেড়ে যেতে পারে।'
    ],
    60,
    'premium'
  ),
  (
    'buy-in-bulk',
    'Bulk-এ কিনুন',
    array[
      'একসাথে কিনলে ডিসকাউন্ট পাওয়া যেতে পারে।',
      'বারবার কিনলে পরিবহন খরচ বাড়ে।'
    ],
    70,
    'premium'
  ),
  (
    'future-ready',
    'ভবিষ্যৎ মাথায় রাখুন',
    array[
      'ভবিষ্যতে তলা বাড়ানোর পরিকল্পনা থাকলে শুরুতেই প্রকৌশলীর পরামর্শে ভিত্তি নকশা করুন।',
      'পরে কাঠামোগত পরিবর্তন অনেক বেশি খরচের হতে পারে।'
    ],
    80,
    'premium'
  ),
  (
    'interior-in-stages',
    'Interior ধাপে ধাপে করুন',
    array[
      'শুরুতেই বিলাসবহুল ফিনিশ প্রয়োজন নাও হতে পারে।',
      'প্রয়োজন অনুযায়ী পরে আপগ্রেড করুন।'
    ],
    90,
    'premium'
  ),
  (
    'plan-utilities',
    'Utility smart করুন',
    array[
      'ইলেকট্রিক্যাল ও প্লাম্বিং শুরুতেই পরিকল্পনা করুন।',
      'ভবিষ্যতে দেয়াল ভাঙার প্রয়োজন কমবে।'
    ],
    100,
    'premium'
  );

commit;
