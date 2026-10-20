-- Teachers should only see batch assignments for students enrolled in a module
-- they actually teach in that batch. The previous policy granted every
-- assignment in the batch as soon as the teacher had any timetable there.
create or replace function public.can_teacher_access_batch_student(
  p_batch_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timetables t
    join public.student_enrollments se
      on se.module_id = t.module_id
     and se.student_id = p_student_id
    where t.batch_id = p_batch_id
      and t.teacher_id = auth.uid()
      and se.status = 'assigned'
  );
$$;

grant execute on function public.can_teacher_access_batch_student(uuid, uuid) to authenticated;

drop policy if exists "Teacher Policy" on public.batch_assignments;

create policy "Teacher Policy"
on public.batch_assignments
for select
to authenticated
using (
  public.is_teacher()
  and public.can_teacher_access_batch_student(batch_id, student_id)
);
