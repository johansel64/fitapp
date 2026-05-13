import { createClient } from '@supabase/supabase-js'

// Reemplaza con tus credenciales de Supabase
// Ve a supabase.com → tu proyecto → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://TU_PROYECTO.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

/*
=== SQL para crear las tablas en Supabase (Table Editor → SQL Editor) ===

-- Planes (generados por IA o predefinidos)
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  emoji text default '💪',
  goal text,
  level text,
  total_days int default 30,
  data jsonb,           -- estructura completa del plan (semanas, ejercicios)
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Progreso diario
create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  day_number int not null,
  completed_at timestamptz default now(),
  exercises_done jsonb,  -- qué ejercicios se completaron ese día
  notes text
);

-- Series completadas dentro de un ejercicio
create table series_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  day_number int not null,
  exercise_name text not null,
  series_done int default 0,
  completed boolean default false,
  logged_at timestamptz default now()
);

-- Row Level Security (RLS) — cada usuario solo ve sus datos
alter table plans enable row level security;
alter table progress enable row level security;
alter table series_log enable row level security;

create policy "users own plans" on plans for all using (auth.uid() = user_id);
create policy "users own progress" on progress for all using (auth.uid() = user_id);
create policy "users own series_log" on series_log for all using (auth.uid() = user_id);

=====================================
*/
