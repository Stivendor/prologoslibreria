-- Prólogos Librería — Esquema base del MVP
-- Entidades principales según la planeación: Categoría y Libro.

create extension if not exists "pgcrypto";

-- Categorías del catálogo (Favoritos del mes, Devocionales, etc.)
create table if not exists categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  orden       integer not null default 0,
  creado_en   timestamptz not null default now()
);

-- Libros del catálogo
create table if not exists libros (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  autor        text not null,
  precio       numeric(12,2) not null check (precio >= 0),
  descripcion  text,
  imagen_url   text,
  categoria_id uuid references categorias(id) on delete set null,
  activo       boolean not null default true,
  destacado    boolean not null default false,
  creado_en    timestamptz not null default now()
);

create index if not exists libros_categoria_idx on libros (categoria_id);
create index if not exists libros_activo_idx on libros (activo);
create index if not exists libros_destacado_idx on libros (destacado);

-- Pedidos (para registrar ventas del checkout — RF-06/RF-07)
create table if not exists pedidos (
  id            uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_email  text not null,
  cliente_telefono text,
  ciudad         text,
  direccion      text,
  total          numeric(12,2) not null check (total >= 0),
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','pagado','cancelado','entregado')),
  referencia_pago text,
  creado_en      timestamptz not null default now()
);

create table if not exists pedido_items (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos(id) on delete cascade,
  libro_id    uuid references libros(id) on delete set null,
  titulo      text not null,
  precio      numeric(12,2) not null check (precio >= 0),
  cantidad    integer not null check (cantidad > 0)
);

create index if not exists pedido_items_pedido_idx on pedido_items (pedido_id);

-- Row Level Security: catálogo de lectura pública; escritura solo para service role.
alter table categorias enable row level security;
alter table libros enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

drop policy if exists "categorias lectura publica" on categorias;
create policy "categorias lectura publica"
  on categorias for select using (true);

drop policy if exists "libros lectura publica" on libros;
create policy "libros lectura publica"
  on libros for select using (activo = true);
