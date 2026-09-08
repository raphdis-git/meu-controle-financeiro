-- Orçamento persistente por usuário. Não importa nem remove transacoes legadas.
begin;
create table if not exists public.orcamentos (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document)='object' and document ?& array['rows','records','archived'] and jsonb_typeof(document->'rows')='array' and jsonb_typeof(document->'records')='object' and jsonb_typeof(document->'archived')='array'),
 revision bigint not null default 1 check (revision>0),
 updated_at timestamptz not null default now()
);
alter table public.orcamentos enable row level security;
revoke all on public.orcamentos from anon, authenticated;
grant select,insert,update on public.orcamentos to authenticated;
create policy orcamento_owner_select on public.orcamentos for select to authenticated using ((select auth.uid())=user_id);
create policy orcamento_owner_insert on public.orcamentos for insert to authenticated with check ((select auth.uid())=user_id);
create policy orcamento_owner_update on public.orcamentos for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.save_orcamento(p_document jsonb,p_revision bigint)
returns bigint language plpgsql security invoker set search_path='' as $$
declare next_revision bigint;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED' using errcode='42501'; end if;
 if p_revision is null or p_revision<0 then raise exception 'INVALID_REVISION'; end if;
 if p_revision=0 then
  insert into public.orcamentos(user_id,document,revision) values(auth.uid(),p_document,1) on conflict do nothing returning revision into next_revision;
 else
  update public.orcamentos set document=p_document,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=p_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 return next_revision;
end;
$$;
revoke all on function public.save_orcamento(jsonb,bigint) from public,anon;
grant execute on function public.save_orcamento(jsonb,bigint) to authenticated;
commit;
