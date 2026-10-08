-- DayOne uses trusted server PostgreSQL connections, not the Supabase Data API.
-- Limit changes to DayOne's own tables; unrelated project tables are preserved.
DO $$
DECLARE
  target_table text;
  api_role text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'auth_user', 'auth_session', 'auth_account', 'auth_verification',
    'auth_rate_limit', 'command_limits', 'teams', 'templates', 'template_tasks',
    'hires', 'tasks', 'task_dependencies', 'review_episodes', 'approvals',
    'activities', 'intake_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', target_table);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', target_table, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
