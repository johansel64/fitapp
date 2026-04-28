-- =============================================
-- FITAPP v2 — Schema completo
-- Pega esto en Supabase → SQL Editor → Run
-- =============================================

-- Limpiar tablas anteriores si existen
drop table if exists series_log cascade;
drop table if exists progress cascade;
drop table if exists plan_day_exercises cascade;
drop table if exists plan_days cascade;
drop table if exists plan_likes cascade;
drop table if exists exercise_likes cascade;
drop table if exists plans cascade;
drop table if exists exercises cascade;

-- ── EJERCICIOS ────────────────────────────────
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  youtube_url text,
  muscle_group text,   -- chest, back, legs, shoulders, arms, core, cardio, full_body
  equipment text,      -- none, dumbbells, barbell, machine, bands, bodyweight
  difficulty text,     -- beginner, intermediate, advanced
  is_public boolean default false,
  likes_count int default 0,
  created_at timestamptz default now()
);

-- ── LIKES DE EJERCICIOS ───────────────────────
create table exercise_likes (
  user_id uuid references auth.users(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, exercise_id)
);

-- ── PLANES ───────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  total_days int default 30,
  is_public boolean default false,
  likes_count int default 0,
  created_at timestamptz default now()
);

-- ── LIKES DE PLANES ───────────────────────────
create table plan_likes (
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, plan_id)
);

-- ── DÍAS DEL PLAN ─────────────────────────────
create table plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  day_number int not null,
  type text default 'training',  -- training | rest
  name text,
  created_at timestamptz default now(),
  unique (plan_id, day_number)
);

-- ── EJERCICIOS POR DÍA ────────────────────────
create table plan_day_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid references plan_days(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  sets int default 3,
  reps text default '12',         -- puede ser "12" o "30s"
  rest_seconds int default 45,
  duration_seconds int,           -- para ejercicios de tiempo
  order_index int default 0,
  created_at timestamptz default now()
);

-- ── PROGRESO DEL USUARIO ──────────────────────
create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  day_number int not null,
  completed_at timestamptz default now(),
  exercises_done jsonb,
  unique (user_id, plan_id, day_number)
);

-- ── SERIES COMPLETADAS ────────────────────────
create table series_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete cascade,
  day_number int not null,
  exercise_name text not null,
  series_done int default 0,
  completed boolean default false,
  logged_at timestamptz default now(),
  unique (user_id, plan_id, day_number, exercise_name)
);

-- ── PLAN ACTIVO POR USUARIO ───────────────────
create table user_active_plan (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  started_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table exercises enable row level security;
alter table exercise_likes enable row level security;
alter table plans enable row level security;
alter table plan_likes enable row level security;
alter table plan_days enable row level security;
alter table plan_day_exercises enable row level security;
alter table progress enable row level security;
alter table series_log enable row level security;
alter table user_active_plan enable row level security;

-- Exercises: ver propios + públicos, editar solo propios
create policy "exercises_select" on exercises for select
  using (is_public = true or auth.uid() = user_id);
create policy "exercises_insert" on exercises for insert
  with check (auth.uid() = user_id);
create policy "exercises_update" on exercises for update
  using (auth.uid() = user_id);
create policy "exercises_delete" on exercises for delete
  using (auth.uid() = user_id);

-- Exercise likes
create policy "exercise_likes_select" on exercise_likes for select using (true);
create policy "exercise_likes_insert" on exercise_likes for insert
  with check (auth.uid() = user_id);
create policy "exercise_likes_delete" on exercise_likes for delete
  using (auth.uid() = user_id);

-- Plans: ver propios + públicos
create policy "plans_select" on plans for select
  using (is_public = true or auth.uid() = user_id);
create policy "plans_insert" on plans for insert
  with check (auth.uid() = user_id);
create policy "plans_update" on plans for update
  using (auth.uid() = user_id);
create policy "plans_delete" on plans for delete
  using (auth.uid() = user_id);

-- Plan likes
create policy "plan_likes_select" on plan_likes for select using (true);
create policy "plan_likes_insert" on plan_likes for insert
  with check (auth.uid() = user_id);
create policy "plan_likes_delete" on plan_likes for delete
  using (auth.uid() = user_id);

-- Plan days: ver si el plan es visible
create policy "plan_days_select" on plan_days for select
  using (exists (
    select 1 from plans where id = plan_days.plan_id
    and (is_public = true or user_id = auth.uid())
  ));
create policy "plan_days_insert" on plan_days for insert
  with check (exists (
    select 1 from plans where id = plan_days.plan_id and user_id = auth.uid()
  ));
create policy "plan_days_update" on plan_days for update
  using (exists (
    select 1 from plans where id = plan_days.plan_id and user_id = auth.uid()
  ));
create policy "plan_days_delete" on plan_days for delete
  using (exists (
    select 1 from plans where id = plan_days.plan_id and user_id = auth.uid()
  ));

-- Plan day exercises
create policy "pde_select" on plan_day_exercises for select
  using (exists (
    select 1 from plan_days pd
    join plans p on p.id = pd.plan_id
    where pd.id = plan_day_exercises.plan_day_id
    and (p.is_public = true or p.user_id = auth.uid())
  ));
create policy "pde_insert" on plan_day_exercises for insert
  with check (exists (
    select 1 from plan_days pd
    join plans p on p.id = pd.plan_id
    where pd.id = plan_day_exercises.plan_day_id
    and p.user_id = auth.uid()
  ));
create policy "pde_update" on plan_day_exercises for update
  using (exists (
    select 1 from plan_days pd
    join plans p on p.id = pd.plan_id
    where pd.id = plan_day_exercises.plan_day_id
    and p.user_id = auth.uid()
  ));
create policy "pde_delete" on plan_day_exercises for delete
  using (exists (
    select 1 from plan_days pd
    join plans p on p.id = pd.plan_id
    where pd.id = plan_day_exercises.plan_day_id
    and p.user_id = auth.uid()
  ));

-- Progress y series_log: solo propios
create policy "progress_all" on progress for all using (auth.uid() = user_id);
create policy "series_log_all" on series_log for all using (auth.uid() = user_id);
create policy "uap_all" on user_active_plan for all using (auth.uid() = user_id);

-- =============================================
-- FUNCIONES
-- =============================================

-- Toggle like en ejercicio
create or replace function toggle_exercise_like(p_exercise_id uuid)
returns boolean language plpgsql security definer as $$
declare
  already_liked boolean;
begin
  select exists(
    select 1 from exercise_likes
    where user_id = auth.uid() and exercise_id = p_exercise_id
  ) into already_liked;

  if already_liked then
    delete from exercise_likes where user_id = auth.uid() and exercise_id = p_exercise_id;
    update exercises set likes_count = likes_count - 1 where id = p_exercise_id;
    return false;
  else
    insert into exercise_likes (user_id, exercise_id) values (auth.uid(), p_exercise_id);
    update exercises set likes_count = likes_count + 1 where id = p_exercise_id;
    return true;
  end if;
end;
$$;

-- Toggle like en plan
create or replace function toggle_plan_like(p_plan_id uuid)
returns boolean language plpgsql security definer as $$
declare
  already_liked boolean;
begin
  select exists(
    select 1 from plan_likes
    where user_id = auth.uid() and plan_id = p_plan_id
  ) into already_liked;

  if already_liked then
    delete from plan_likes where user_id = auth.uid() and plan_id = p_plan_id;
    update plans set likes_count = likes_count - 1 where id = p_plan_id;
    return false;
  else
    insert into plan_likes (user_id, plan_id) values (auth.uid(), p_plan_id);
    update plans set likes_count = likes_count + 1 where id = p_plan_id;
    return true;
  end if;
end;
$$;
