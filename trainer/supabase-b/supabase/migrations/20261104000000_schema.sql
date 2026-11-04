-- Architettura B: Postgres gestito da Supabase. Non c'e' un server nostro:
-- il browser parla direttamente con il database tramite l'API di Supabase,
-- e l'isolamento lo garantiscono le policy RLS qui sotto.
-- Due tipi di utente in Supabase Auth: trainer e atleta (profili.ruolo).
-- Un atleta e' collegato a un solo record di public.atleti tramite un
-- codice invito creato dal suo trainer.

-- ------------------------------------------------------------------ tabelle
create table public.profili (
  id         uuid primary key references auth.users(id) on delete cascade,
  ruolo      text not null default 'trainer' check (ruolo in ('trainer', 'atleta')),
  nome       text not null default '',
  creato_il  timestamptz not null default now()
);

create table public.atleti (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  utente_id  uuid unique references auth.users(id) on delete set null,   -- account dell'app atleta
  nome       text not null check (char_length(nome) between 1 and 100),
  email      text not null default '',
  telefono   text not null default '',
  note       text not null default '',
  profilo    jsonb not null default '{}'::jsonb,
  creato_il  timestamptz not null default now()
);
create index atleti_trainer on public.atleti (trainer_id, nome);

create table public.programmi (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  atleta_id     uuid not null references public.atleti(id) on delete cascade,
  nome          text not null,
  stato         text not null check (stato in ('bozza', 'attivo', 'archiviato')),
  scheda        jsonb not null,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index programmi_atleta on public.programmi (atleta_id);
create unique index programmi_un_attivo on public.programmi (atleta_id) where stato = 'attivo';

create table public.sedute (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references auth.users(id) on delete cascade,   -- impostato dal trigger
  atleta_id     uuid not null references public.atleti(id) on delete cascade,
  programma_id  uuid references public.programmi(id) on delete set null,
  data          date not null,
  sessione_ref  text not null default '',
  nome_sessione text not null default '',
  durata_min    integer not null default 0,
  note          text not null default '',
  esercizi      jsonb not null default '[]'::jsonb,
  origine       text not null default 'trainer' check (origine in ('trainer', 'atleta')),   -- impostata dal trigger
  creato_il     timestamptz not null default now()
);
create index sedute_atleta on public.sedute (atleta_id, data);

create table public.esercizi_personali (
  id         text primary key default ('pt-' || gen_random_uuid()),
  trainer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome       text not null,
  dati       jsonb not null,
  creato_il  timestamptz not null default now()
);

-- codici invito: solo l'hash, monouso, validi 7 giorni
create table public.inviti (
  codice_hash text primary key,
  atleta_id   uuid not null references public.atleti(id) on delete cascade,
  trainer_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scade_il    timestamptz not null default now() + interval '7 days',
  usato_il    timestamptz
);

-- ------------------------------------------------------------------ funzioni di supporto
-- security definer: leggono i profili senza passare dalle policy (evita ricorsioni)
create function public.ruolo_corrente() returns text
language sql stable security definer set search_path = '' as
$$ select ruolo from public.profili where id = auth.uid() $$;

create function public.miei_atleti() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select id from public.atleti where utente_id = auth.uid() $$;

create function public.hash_codice(p_codice text) returns text
language sql immutable set search_path = '' as
$$ select encode(sha256(convert_to(upper(regexp_replace(coalesce(p_codice, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex') $$;

-- ------------------------------------------------------------------ RLS
alter table public.profili            enable row level security;
alter table public.atleti             enable row level security;
alter table public.programmi          enable row level security;
alter table public.sedute             enable row level security;
alter table public.esercizi_personali enable row level security;
alter table public.inviti             enable row level security;

-- profili: il proprio; l'atleta vede anche quello del suo trainer (per il nome)
create policy "profilo proprio" on public.profili for select to authenticated
  using (id = (select auth.uid()));
create policy "profilo del mio trainer" on public.profili for select to authenticated
  using (id in (select a.trainer_id from public.atleti a where a.id in (select public.miei_atleti())));

-- atleti: il trainer gestisce i suoi; l'atleta legge solo il proprio record
create policy "trainer: i miei atleti" on public.atleti for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()) and (select public.ruolo_corrente()) = 'trainer');
create policy "atleta: il mio record" on public.atleti for select to authenticated
  using (utente_id = (select auth.uid()));

-- schede: il trainer gestisce le sue; l'atleta vede solo quella attiva
create policy "trainer: le mie schede" on public.programmi for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and exists (select 1 from public.atleti a where a.id = atleta_id and a.trainer_id = (select auth.uid()))
  );
create policy "atleta: la mia scheda attiva" on public.programmi for select to authenticated
  using (stato = 'attivo' and atleta_id in (select public.miei_atleti()));

-- sedute: trainer_id e origine li decide il trigger, non chi scrive
create policy "trainer: sedute dei miei atleti" on public.sedute for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid()) and origine = 'trainer'
    and (programma_id is null or exists (select 1 from public.programmi p where p.id = programma_id and p.atleta_id = sedute.atleta_id))
  );
create policy "atleta: leggo le mie sedute" on public.sedute for select to authenticated
  using (atleta_id in (select public.miei_atleti()));
create policy "atleta: registro le mie sedute" on public.sedute for insert to authenticated
  with check (
    origine = 'atleta' and atleta_id in (select public.miei_atleti())
    and (programma_id is null or exists (select 1 from public.programmi p where p.id = programma_id and p.atleta_id = sedute.atleta_id))
  );

-- esercizi personali: del trainer; i suoi atleti li leggono (per "come si fa")
create policy "trainer: i miei esercizi" on public.esercizi_personali for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()) and (select public.ruolo_corrente()) = 'trainer');
create policy "atleta: esercizi del mio trainer" on public.esercizi_personali for select to authenticated
  using (trainer_id in (select a.trainer_id from public.atleti a where a.id in (select public.miei_atleti())));

-- inviti: solo il trainer, e solo per i suoi atleti
create policy "trainer: i miei inviti" on public.inviti for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and exists (select 1 from public.atleti a where a.id = atleta_id and a.trainer_id = (select auth.uid()))
  );

-- ------------------------------------------------------------------ trigger
-- attivare una scheda archivia la precedente (gira come chi scrive: valgono le policy)
create function public.archivia_programma_attivo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stato = 'attivo' and (tg_op = 'INSERT' or old.stato <> 'attivo') then
    update public.programmi set stato = 'archiviato'
      where atleta_id = new.atleta_id and stato = 'attivo' and id <> new.id;
  end if;
  new.aggiornato_il := now();
  return new;
end $$;
create trigger programmi_attiva before insert or update on public.programmi
  for each row execute function public.archivia_programma_attivo();

-- la seduta eredita il trainer dall'atleta e registra chi l'ha scritta;
-- le policy (valutate dopo il trigger) decidono poi se la scrittura e' ammessa
create function public.prepara_seduta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select trainer_id, case when utente_id = auth.uid() then 'atleta' else 'trainer' end
    into new.trainer_id, new.origine
    from public.atleti where id = new.atleta_id;
  return new;
end $$;
create trigger sedute_prepara before insert on public.sedute
  for each row execute function public.prepara_seduta();

-- profilo alla registrazione: ruolo e nome dai metadati di Supabase Auth
create function public.nuovo_utente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profili (id, ruolo, nome) values (
    new.id,
    case when new.raw_user_meta_data ->> 'ruolo' = 'atleta' then 'atleta' else 'trainer' end,
    coalesce(new.raw_user_meta_data ->> 'nome', '')
  );
  return new;
end $$;
create trigger su_nuovo_utente after insert on auth.users
  for each row execute function public.nuovo_utente();

-- ------------------------------------------------------------------ inviti (RPC)
-- il trainer crea un codice: ritorna il codice in chiaro una sola volta
create function public.crea_invito(p_atleta uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codice text := '';
  i int;
begin
  -- byte 6 e 8 dell'uuid hanno bit fissi (versione/variante): si saltano
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    codice := codice || substr(alfabeto, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  delete from public.inviti where atleta_id = p_atleta and usato_il is null;
  insert into public.inviti (codice_hash, atleta_id) values (public.hash_codice(codice), p_atleta);
  return substr(codice, 1, 4) || '-' || substr(codice, 5, 4);
end $$;

-- l'atleta (gia' registrato con ruolo atleta) usa il codice: collega il suo account
create function public.riscatta_invito(p_codice text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.inviti;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if (select ruolo from public.profili where id = auth.uid()) is distinct from 'atleta' then
    raise exception 'Questo account non e'' un account atleta';
  end if;
  select * into v_inv from public.inviti
    where codice_hash = public.hash_codice(p_codice) and usato_il is null and scade_il > now()
    for update;
  if not found then raise exception 'Codice non valido o scaduto'; end if;
  update public.atleti set utente_id = null where utente_id = auth.uid();
  update public.atleti set utente_id = auth.uid() where id = v_inv.atleta_id;
  update public.inviti set usato_il = now() where codice_hash = v_inv.codice_hash;
  return v_inv.atleta_id;
end $$;

-- ------------------------------------------------------------------ viste
-- elenco atleti con ultima seduta, scheda attiva e stato dell'app atleta.
-- security_invoker: la vista rispetta le policy di chi la interroga.
create view public.atleti_riepilogo with (security_invoker = true) as
  select a.id, a.trainer_id, a.nome, a.email, a.telefono, a.note, a.profilo, a.creato_il,
    (select max(s.data) from public.sedute s where s.atleta_id = a.id) as ultima_seduta,
    p.id as programma_attivo_id, p.nome as programma_attivo_nome,
    (a.utente_id is not null) as account_attivo,
    (select max(i.scade_il) from public.inviti i where i.atleta_id = a.id and i.usato_il is null and i.scade_il > now()) as invito_scade
  from public.atleti a
  left join public.programmi p on p.atleta_id = a.id and p.stato = 'attivo';

-- ------------------------------------------------------------------ permessi
-- Supabase concede di default tutti i privilegi sulle nuove tabelle: si
-- parte da zero e si concede solo il necessario.
revoke all on public.profili, public.atleti, public.programmi, public.sedute,
  public.esercizi_personali, public.inviti, public.atleti_riepilogo from anon, authenticated;
-- su atleti si scrivono solo i campi anagrafici: trainer_id e utente_id
-- non li puo' cambiare nessun client (utente_id solo via riscatta_invito)
grant select, delete on public.atleti to authenticated;
grant insert (nome, email, telefono, note, profilo) on public.atleti to authenticated;
grant update (nome, email, telefono, note, profilo) on public.atleti to authenticated;
grant select, insert, update, delete on public.programmi, public.esercizi_personali to authenticated;
grant select, insert, delete on public.sedute, public.inviti to authenticated;
grant select on public.profili, public.atleti_riepilogo to authenticated;
grant execute on function public.crea_invito(uuid), public.riscatta_invito(text) to authenticated;
revoke execute on function public.crea_invito(uuid), public.riscatta_invito(text) from anon, public;
