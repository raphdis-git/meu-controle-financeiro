-- Executar no corte para o novo aplicativo. Preserva todos os registros antigos.
begin;
drop policy if exists transacoes_delete_public on public.transacoes;
drop policy if exists transacoes_update_public on public.transacoes;
drop policy if exists transacoes_insert_public on public.transacoes;
drop policy if exists transacoes_select_public on public.transacoes;
revoke all on public.transacoes from anon,authenticated;
commit;
