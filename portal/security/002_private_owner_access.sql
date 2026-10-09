-- Apply 001_buyers.sql first; this migration matches the protected production schema.
create schema if not exists portal_private;
revoke all on schema portal_private from public,anon,authenticated;
grant usage on schema portal_private to authenticated;
create table if not exists portal_private.portal_owners(user_id uuid primary key references auth.users(id) on delete cascade);
alter table portal_private.portal_owners enable row level security;
revoke all on portal_private.portal_owners from public,anon,authenticated;
revoke all on public.portal_purchases from public,anon,authenticated;
grant select,insert,update,delete on public.portal_purchases to service_role;
create index if not exists portal_active_email on public.portal_purchases(email) where active;
create or replace function portal_private.is_portal_buyer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and (
 exists(select 1 from portal_private.portal_owners o where o.user_id=u.id)
 or exists(select 1 from public.portal_purchases p where p.email=lower(trim(u.email)) and p.active)));
$$;
revoke all on function portal_private.is_portal_buyer() from public,anon;
grant execute on function portal_private.is_portal_buyer() to authenticated;
create or replace function public.is_portal_buyer() returns boolean language sql stable security invoker set search_path='' as $$ select portal_private.is_portal_buyer(); $$;
revoke all on function public.is_portal_buyer() from public,anon;
grant execute on function public.is_portal_buyer() to authenticated;
alter policy "Verified buyers read the library" on storage.objects using(bucket_id='portal-library' and (select portal_private.is_portal_buyer()));
-- Owners are enrolled separately after their email is confirmed.
