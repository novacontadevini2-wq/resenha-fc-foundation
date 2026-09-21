create or replace function public.set_round_participation(p_round_id uuid, p_player_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas administradores podem alterar a presença.';
  end if;
  if p_status not in ('confirmed','declined','pending') then
    raise exception 'Status inválido.';
  end if;
  v_status := p_status;
  if v_status = 'pending' then
    delete from public.round_players where round_id = p_round_id and player_id = p_player_id;
    return 'pending';
  end if;
  insert into public.round_players (round_id, player_id, participation_status)
  values (p_round_id, p_player_id, v_status)
  on conflict (round_id, player_id) do update set participation_status = excluded.participation_status, updated_at = now();
  return v_status;
end;
$$;

revoke all on function public.set_round_participation(uuid, uuid, text) from public, anon;
grant execute on function public.set_round_participation(uuid, uuid, text) to authenticated;