-- ── TABLA LEADS ──────────────────────────────────────────────────────────────
create table leads (
  id uuid default gen_random_uuid() primary key,
  instagram_id text unique not null,
  nombre text,
  fuente text default 'directo',
  estado text default 'nuevo',
  -- estados: nuevo | en_conversacion | cualificado | revision_humana | calendario_enviado | agendo | compro | cerrado
  fase_actual integer default 1,
  ultimo_mensaje timestamptz,
  created_at timestamptz default now()
);

-- ── TABLA MENSAJES ────────────────────────────────────────────────────────────
create table mensajes (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  rol text not null, -- 'lead' | 'roberto'
  texto text not null,
  es_sugerido boolean default false, -- true cuando es sugerencia para el setter en pausa
  created_at timestamptz default now()
);

-- ── ÍNDICES ───────────────────────────────────────────────────────────────────
create index idx_leads_instagram_id on leads(instagram_id);
create index idx_leads_estado on leads(estado);
create index idx_mensajes_lead_id on mensajes(lead_id);
create index idx_mensajes_created_at on mensajes(created_at);

-- ── PERMISOS (desactivar RLS para uso con service key) ────────────────────────
alter table leads disable row level security;
alter table mensajes disable row level security;
