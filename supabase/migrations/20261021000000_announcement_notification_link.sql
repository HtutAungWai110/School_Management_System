-- Convert announcement_posted notification links from the query-parameter
-- form (/role/dashboard/batches/<id>/announcements?announcement_id=<id>) to
-- the path form (/role/dashboard/batches/<id>/announcements/<id>) used by the
-- per-announcement pages.
UPDATE public.notifications n
SET data = jsonb_set(
  data,
  '{link}',
  to_jsonb(
    regexp_replace(
      n.data->>'link',
      $re$^/([^/]+)/dashboard/batches/([0-9a-f-]+)/announcements\?announcement_id=([0-9a-f-]+)$$re$,
      '/\1/dashboard/batches/\2/announcements/\3'
    )
  )
)
WHERE n.type = 'announcement_posted'
  AND n.data->>'link' ~ $re$^/[^/]+/dashboard/batches/[0-9a-f-]+/announcements\?announcement_id=$re$;
