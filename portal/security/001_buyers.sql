-- Run in the buyer portal's dedicated Supabase project.
create table public.portal_purchases (
  shop_domain text not null,
  order_id text not null,
  email text not null check (email = lower(trim(email))),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (shop_domain, order_id)
);
alter table public.portal_purchases enable row level security;
revoke all on public.portal_purchases from anon, authenticated;

create or replace function public.is_portal_buyer()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.portal_purchases p
    join auth.users u on lower(trim(u.email)) = p.email
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and p.active
  );
$$;
revoke all on function public.is_portal_buyer() from public;
grant execute on function public.is_portal_buyer() to authenticated;

insert into storage.buckets (id, name, public)
values ('portal-library', 'portal-library', false)
on conflict (id) do update set public = false;

create policy "Verified buyers read the library"
on storage.objects for select to authenticated
using (bucket_id = 'portal-library' and public.is_portal_buyer());

-- No client upload/write policy: only the deployment service uploads books.
