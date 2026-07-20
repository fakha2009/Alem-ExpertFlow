UPDATE experts e
SET current_load = counts.active_count,
    updated_at = now()
FROM (
  SELECT
    e2.id,
    count(r.id)::integer AS active_count
  FROM experts e2
  LEFT JOIN requests r
    ON r.assigned_expert_id = e2.id
    AND r.status IN ('assigned', 'in_progress', 'review')
  GROUP BY e2.id
) counts
WHERE e.id = counts.id
  AND e.current_load <> counts.active_count;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY request_id
      ORDER BY created_at DESC, id DESC
    ) AS position
  FROM assignments
  WHERE status = 'assigned'
)
UPDATE assignments a
SET status = 'declined', updated_at = now()
FROM ranked
WHERE a.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_per_request
  ON assignments(request_id)
  WHERE status = 'assigned';
