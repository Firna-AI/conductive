export const runningWorkspacePredicate = `w.archived_at IS NULL
  AND w.state IN ('starting', 'ready', 'working', 'unread', 'input')`

export const workspaceStateCounts = `
  COUNT(CASE WHEN ${runningWorkspacePredicate} THEN 1 END) AS running,
  COUNT(CASE WHEN w.archived_at IS NULL AND w.state = 'stopped' THEN 1 END) AS stopped,
  COUNT(CASE WHEN w.archived_at IS NULL AND w.state = 'error' THEN 1 END) AS failed,
  COUNT(CASE WHEN w.archived_at IS NOT NULL OR w.state = 'archived' THEN 1 END) AS archived`
