DROP INDEX image_builds_running;
CREATE UNIQUE INDEX image_builds_running ON image_builds(org_id)
  WHERE state = 'running' AND waiting_for_switch_id IS NULL;
