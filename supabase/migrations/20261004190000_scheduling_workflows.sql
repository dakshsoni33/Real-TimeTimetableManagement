create or replace function public.has_schedule_conflict(
  p_class_date date,
  p_slot_id bigint,
  p_faculty_id bigint,
  p_room_id bigint,
  p_section_id bigint,
  p_batch_id bigint,
  p_group_id bigint,
  p_exclude_class_id bigint default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_session cs
    join public.time_slot candidate on candidate.slot_id = p_slot_id
    join public.time_slot occupied on occupied.slot_id = cs.slot_id
    where cs.class_date = p_class_date
      and cs.status = 'SCHEDULED'
      and (p_exclude_class_id is null or cs.class_id <> p_exclude_class_id)
      and occupied.start_time < candidate.end_time
      and occupied.end_time > candidate.start_time
      and (
        cs.faculty_id = p_faculty_id
        or cs.room_id = p_room_id
        or (
          cs.section_id = p_section_id
          and (
            p_batch_id is null
            or cs.batch_id is null
            or cs.batch_id = p_batch_id
          )
          and (
            p_group_id is null
            or cs.group_id is null
            or cs.group_id = p_group_id
          )
        )
      )
  );
$$;

create or replace function public.cancel_class_session(p_class_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.class_session%rowtype;
  actor_faculty_id bigint := public.current_faculty_id();
begin
  select * into target
  from public.class_session
  where class_id = p_class_id
  for update;

  if not found then
    raise exception 'Class session was not found';
  end if;

  if target.status <> 'SCHEDULED' then
    raise exception 'Only a scheduled class can be cancelled';
  end if;

  if not public.is_admin() and target.faculty_id is distinct from actor_faculty_id then
    raise exception 'Faculty may cancel only their own assigned class';
  end if;

  update public.class_session
  set status = 'CANCELLED'
  where class_id = target.class_id;

  insert into public.notification (
    student_id,
    class_id,
    notification_type,
    message
  )
  select
    s.student_id,
    target.class_id,
    'CLASS_CANCELLED',
    'A class in your academic scope was cancelled. The original remains in history.'
  from public.student s
  where s.section_id = target.section_id
    and (target.batch_id is null or s.batch_id = target.batch_id)
    and (
      target.group_id is null
      or exists (
        select 1
        from public.student_course sc
        where sc.student_id = s.student_id
          and sc.group_id = target.group_id
      )
    );

  insert into public.notification (
    faculty_id,
    class_id,
    notification_type,
    message
  )
  select distinct
    ta.faculty_id,
    target.class_id,
    'VACANT_SLOT_AVAILABLE',
    'A relevant cancelled class created a vacant period.'
  from public.teaching_assignment ta
  where ta.section_id = target.section_id
    and (
      target.batch_id is null
      or ta.batch_id is null
      or ta.batch_id = target.batch_id
    )
    and ta.faculty_id <> target.faculty_id;

  return target.class_id;
end;
$$;

create or replace function public.reschedule_class_session(
  p_class_id bigint,
  p_class_date date,
  p_slot_id bigint,
  p_room_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  original public.class_session%rowtype;
  selected_room public.room%rowtype;
  actor_faculty_id bigint := public.current_faculty_id();
  replacement_id bigint;
  affected_strength integer;
begin
  select * into original
  from public.class_session
  where class_id = p_class_id
  for update;

  if not found then
    raise exception 'Class session was not found';
  end if;

  if original.status <> 'SCHEDULED' then
    raise exception 'Only a scheduled class can be rescheduled';
  end if;

  if not public.is_admin() and original.faculty_id is distinct from actor_faculty_id then
    raise exception 'Faculty may reschedule only their own assigned class';
  end if;

  if not exists (select 1 from public.time_slot where slot_id = p_slot_id) then
    raise exception 'Time slot was not found';
  end if;

  select * into selected_room
  from public.room
  where room_id = p_room_id
  for share;

  if not found or selected_room.status <> 'AVAILABLE' then
    raise exception 'Room is not available';
  end if;

  affected_strength := public.scope_strength(
    original.section_id,
    original.batch_id,
    original.group_id
  );

  if affected_strength > selected_room.capacity then
    raise exception 'Room capacity is insufficient';
  end if;

  if public.has_schedule_conflict(
    p_class_date,
    p_slot_id,
    original.faculty_id,
    p_room_id,
    original.section_id,
    original.batch_id,
    original.group_id,
    original.class_id
  ) then
    raise exception 'Scheduling conflict detected for the actual time range';
  end if;

  update public.class_session
  set status = 'CANCELLED'
  where class_id = original.class_id;

  insert into public.class_session (
    timetable_id,
    course_id,
    faculty_id,
    section_id,
    batch_id,
    group_id,
    room_id,
    slot_id,
    class_date,
    class_type,
    status,
    reschedule_of,
    vacancy_of
  ) values (
    original.timetable_id,
    original.course_id,
    original.faculty_id,
    original.section_id,
    original.batch_id,
    original.group_id,
    p_room_id,
    p_slot_id,
    p_class_date,
    original.class_type,
    'SCHEDULED',
    original.class_id,
    original.vacancy_of
  )
  returning class_id into replacement_id;

  insert into public.notification (
    student_id,
    class_id,
    notification_type,
    message
  )
  select
    s.student_id,
    replacement_id,
    'CLASS_RESCHEDULED',
    'A class was rescheduled. The original session remains in history.'
  from public.student s
  where s.section_id = original.section_id
    and (original.batch_id is null or s.batch_id = original.batch_id)
    and (
      original.group_id is null
      or exists (
        select 1
        from public.student_course sc
        where sc.student_id = s.student_id
          and sc.group_id = original.group_id
      )
    );

  insert into public.notification (
    faculty_id,
    class_id,
    notification_type,
    message
  ) values (
    original.faculty_id,
    replacement_id,
    'CLASS_RESCHEDULED',
    'Your class was rescheduled and linked to the original session.'
  );

  return replacement_id;
end;
$$;

create or replace function public.create_extra_class(
  p_timetable_id bigint,
  p_course_id bigint,
  p_section_id bigint,
  p_batch_id bigint,
  p_group_id bigint,
  p_room_id bigint,
  p_slot_id bigint,
  p_class_date date
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_faculty_id bigint := public.current_faculty_id();
  selected_room public.room%rowtype;
  affected_strength integer;
  created_id bigint;
begin
  if actor_faculty_id is null then
    raise exception 'Authenticated user is not a faculty member';
  end if;

  if not exists (
    select 1
    from public.timetable
    where timetable_id = p_timetable_id and status = 'PUBLISHED'
  ) then
    raise exception 'Extra classes require a published timetable';
  end if;

  if not exists (
    select 1
    from public.teaching_assignment ta
    where ta.faculty_id = actor_faculty_id
      and ta.course_id = p_course_id
      and ta.section_id = p_section_id
      and (
        p_batch_id is null
        or ta.batch_id is null
        or ta.batch_id = p_batch_id
      )
  ) then
    raise exception 'Faculty is not assigned to this course and section scope';
  end if;

  select * into selected_room
  from public.room
  where room_id = p_room_id
  for share;

  if not found or selected_room.status <> 'AVAILABLE' then
    raise exception 'Room is not available';
  end if;

  affected_strength := public.scope_strength(p_section_id, p_batch_id, p_group_id);
  if affected_strength > selected_room.capacity then
    raise exception 'Room capacity is insufficient';
  end if;

  if public.has_schedule_conflict(
    p_class_date,
    p_slot_id,
    actor_faculty_id,
    p_room_id,
    p_section_id,
    p_batch_id,
    p_group_id
  ) then
    raise exception 'Selected period is not naturally free';
  end if;

  insert into public.class_session (
    timetable_id,
    course_id,
    faculty_id,
    section_id,
    batch_id,
    group_id,
    room_id,
    slot_id,
    class_date,
    class_type,
    status
  ) values (
    p_timetable_id,
    p_course_id,
    actor_faculty_id,
    p_section_id,
    p_batch_id,
    p_group_id,
    p_room_id,
    p_slot_id,
    p_class_date,
    'EXTRA',
    'SCHEDULED'
  )
  returning class_id into created_id;

  insert into public.notification (
    student_id,
    class_id,
    notification_type,
    message
  )
  select
    s.student_id,
    created_id,
    'EXTRA_CLASS',
    'An extra class was added to a naturally free period.'
  from public.student s
  where s.section_id = p_section_id
    and (p_batch_id is null or s.batch_id = p_batch_id)
    and (
      p_group_id is null
      or exists (
        select 1
        from public.student_course sc
        where sc.student_id = s.student_id
          and sc.group_id = p_group_id
      )
    );

  return created_id;
end;
$$;

create or replace function public.publish_timetable(p_timetable_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.timetable%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator may publish a timetable';
  end if;

  select * into target
  from public.timetable
  where timetable_id = p_timetable_id
  for update;

  if not found or target.status <> 'DRAFT' then
    raise exception 'Only a draft timetable may be published';
  end if;

  update public.timetable
  set status = 'ARCHIVED'
  where semester = target.semester
    and academic_year = target.academic_year
    and status = 'PUBLISHED';

  update public.timetable
  set status = 'PUBLISHED', published_at = now()
  where timetable_id = target.timetable_id;

  return target.timetable_id;
end;
$$;

grant execute on function public.cancel_class_session(bigint) to authenticated;
grant execute on function public.reschedule_class_session(bigint, date, bigint, bigint) to authenticated;
grant execute on function public.create_extra_class(bigint, bigint, bigint, bigint, bigint, bigint, bigint, date) to authenticated;
grant execute on function public.publish_timetable(bigint) to authenticated;
