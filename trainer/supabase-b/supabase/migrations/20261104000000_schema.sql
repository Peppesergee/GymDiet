-- Architettura B: Postgres gestito da Supabase. Non c'e' un server nostro:
-- il browser parla direttamente con il database tramite l'API di Supabase,
-- e l'isolamento tra trainer lo garantiscono le policy RLS qui sotto.
-- trainer_id = auth.uid() e' l'utente autenticato di Supabase Auth.

create table public.profili_trainer (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  creato_il  timestamptz not null default now()
);

create table public.clienti (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 100),
  email      text not null default '',
  telefono   text not null default '',
  note       text not null default '',
  profilo    jsonb not null default '{}'::jsonb,
  creato_il  timestamptz not null default now()
);
create index clienti_trainer on public.clienti (trainer_id, nome);

create table public.programmi (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id    uuid not null references public.clienti(id) on delete cascade,
  nome          text not null,
  stato         text not null check (stato in ('bozza', 'attivo', 'archiviato')),
  scheda        jsonb not null,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index programmi_cliente on public.programmi (cliente_id);
create unique index programmi_un_attivo on public.programmi (cliente_id) where stato = 'attivo';

create table public.sedute (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id    uuid not null references public.clienti(id) on delete cascade,
  programma_id  uuid references public.programmi(id) on delete set null,
  data          date not null,
  sessione_ref  text not null default '',
  nome_sessione text not null default '',
  durata_min    integer not null default 0,
  note          text not null default '',
  esercizi      jsonb not null default '[]'::jsonb,
  creato_il     timestamptz not null default now()
);
create index sedute_cliente on public.sedute (cliente_id, data);

create table public.esercizi_personali (
  id         text primary key default ('pt-' || gen_random_uuid()),
  trainer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome       text not null,
  dati       jsonb not null,
  creato_il  timestamptz not null default now()
);

-- ------------------------------------------------------------------ RLS
alter table public.profili_trainer    enable row level security;
alter table public.clienti            enable row level security;
alter table public.programmi          enable row level security;
alter table public.sedute             enable row level security;
alter table public.esercizi_personali enable row level security;

create policy "profilo proprio" on public.profili_trainer
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "clienti propri" on public.clienti
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- un programma o una seduta si possono collegare solo a un cliente del
-- trainer stesso: senza questo controllo si potrebbe scrivere su un
-- cliente_id altrui conoscendone l'id
create policy "programmi propri" on public.programmi
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and exists (select 1 from public.clienti c where c.id = cliente_id and c.trainer_id = (select auth.uid()))
  );

create policy "sedute proprie" on public.sedute
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and exists (select 1 from public.clienti c where c.id = cliente_id and c.trainer_id = (select auth.uid()))
    and (programma_id is null or exists (
      select 1 from public.programmi p where p.id = programma_id and p.trainer_id = (select auth.uid())))
  );

create policy "esercizi propri" on public.esercizi_personali
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

-- ------------------------------------------------------------------ trigger
-- attivare un programma archivia il precedente (gira con i permessi di
-- chi scrive, quindi anche qui valgono le policy)
create function public.archivia_programma_attivo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stato = 'attivo' and (tg_op = 'INSERT' or old.stato <> 'attivo') then
    update public.programmi set stato = 'archiviato'
      where cliente_id = new.cliente_id and stato = 'attivo' and id <> new.id;
  end if;
  new.aggiornato_il := now();
  return new;
end $$;

create trigger programmi_attiva before insert or update on public.programmi
  for each row execute function public.archivia_programma_attivo();

-- profilo creato alla registrazione (nome dai metadati di Supabase Auth)
create function public.nuovo_trainer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profili_trainer (id, nome) values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end $$;

create trigger su_nuovo_utente after insert on auth.users
  for each row execute function public.nuovo_trainer();

-- ------------------------------------------------------------------ viste
-- elenco clienti con ultima seduta e programma attivo, in una sola query.
-- security_invoker: la vista rispetta le policy di chi la interroga.
create view public.clienti_riepilogo with (security_invoker = true) as
  select c.*,
    (select max(s.data) from public.sedute s where s.cliente_id = c.id) as ultima_seduta,
    p.id as programma_attivo_id, p.nome as programma_attivo_nome
  from public.clienti c
  left join public.programmi p on p.cliente_id = c.id and p.stato = 'attivo';

grant select, insert, update, delete on public.clienti, public.programmi, public.sedute, public.esercizi_personali, public.profili_trainer to authenticated;
grant select on public.clienti_riepilogo to authenticated;
