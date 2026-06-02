-- 1. Remove redundant ALL policy on work_updates (individual policies cover same access)
DROP POLICY IF EXISTS "editors write work_updates" ON public.work_updates;

-- 2. Restrict realtime subscriptions to section_timestamps topic only
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "auth subscribe realtime" ON realtime.messages;

CREATE POLICY "auth subscribe section_timestamps only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() LIKE 'section_timestamps%');
