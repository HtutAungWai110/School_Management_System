-- ============================================================
-- RPC: get_teacher_availability
-- Returns TeacherAvailabilitySlot[]: { id, day_of_week, start_time, end_time, modules, batches, classes, status }
-- ============================================================
CREATE OR REPLACE FUNCTION get_teacher_availability(p_teacher_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(slot)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      t.id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      (SELECT jsonb_build_object('id', m.id, 'code', m.code, 'title', m.title)
       FROM modules m WHERE m.id = t.module_id) AS modules,
      (SELECT jsonb_build_object('id', b.id, 'batch_name', b.batch_name)
       FROM batches b WHERE b.id = t.batch_id) AS batches,
      (SELECT jsonb_build_object('id', c.id, 'class_number', c.class_number, 'location', c.location)
       FROM classes c WHERE c.id = t.class_id) AS classes,
      t.status
    FROM timetables t
    WHERE t.teacher_id = p_teacher_id
      AND t.status = 'ongoing'
    ORDER BY t.day_of_week ASC, t.start_time ASC
  ) slot;

  RETURN result;
END;
$$;

-- ============================================================
-- RPC: get_class_availability
-- Returns ClassAvailabilitySlot[]: { id, day_of_week, start_time, end_time, modules, batches, profiles, status }
-- ============================================================
CREATE OR REPLACE FUNCTION get_class_availability(p_class_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(slot)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      t.id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      (SELECT jsonb_build_object('id', m.id, 'code', m.code, 'title', m.title)
       FROM modules m WHERE m.id = t.module_id) AS modules,
      (SELECT jsonb_build_object('id', b.id, 'batch_name', b.batch_name)
       FROM batches b WHERE b.id = t.batch_id) AS batches,
      (SELECT jsonb_build_object('id', p.id, 'full_name', p.full_name)
       FROM profiles p WHERE p.id = t.teacher_id) AS profiles,
      t.status
    FROM timetables t
    WHERE t.class_id = p_class_id
      AND t.status = 'ongoing'
    ORDER BY t.day_of_week ASC, t.start_time ASC
  ) slot;

  RETURN result;
END;
$$;

-- ============================================================
-- RPC: get_batch_availability
-- Returns BatchAvailabilitySlot[]: { id, day_of_week, start_time, end_time, modules, profiles, classes, status }
-- ============================================================
CREATE OR REPLACE FUNCTION get_batch_availability(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(slot)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      t.id,
      t.day_of_week,
      t.start_time,
      t.end_time,
      (SELECT jsonb_build_object('id', m.id, 'code', m.code, 'title', m.title)
       FROM modules m WHERE m.id = t.module_id) AS modules,
      (SELECT jsonb_build_object('id', p.id, 'full_name', p.full_name)
       FROM profiles p WHERE p.id = t.teacher_id) AS profiles,
      (SELECT jsonb_build_object('id', c.id, 'class_number', c.class_number, 'location', c.location)
       FROM classes c WHERE c.id = t.class_id) AS classes,
      t.status
    FROM timetables t
    WHERE t.batch_id = p_batch_id
      AND t.status = 'ongoing'
    ORDER BY t.day_of_week ASC, t.start_time ASC
  ) slot;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_teacher_availability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_availability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_availability(uuid) TO authenticated;
