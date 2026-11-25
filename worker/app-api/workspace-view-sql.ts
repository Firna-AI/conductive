import { activeOrgIdPredicate } from '../data/org-access'

const TAB_IDENTITY = `json_array(tab.value ->> '$.kind', CASE tab.value ->> '$.kind'
  WHEN 'session' THEN tab.value ->> '$.sessionId'
  WHEN 'preview' THEN tab.value ->> '$.port'
  ELSE tab.value ->> '$.path' END)`

function tabCounts(tabs: string): string {
  return `SELECT ${TAB_IDENTITY} AS identity, COUNT(*) AS copies
    FROM json_each(${tabs}) tab GROUP BY identity`
}

// A null keeps the slot for skill positions and prevents a reopened tab from
// matching it. Counting copies matches the reader's handling of duplicate tabs.
export function retainedSkillBaseTabs(saved: string, tabs: string): string {
  const base = `CASE json_type(${saved}, '$.skillBaseTabs')
    WHEN 'array' THEN ${saved} -> '$.skillBaseTabs' ELSE ${saved} -> '$.tabs' END`
  return `(
    WITH previous_tabs AS (${tabCounts(`${saved} -> '$.tabs'`)}),
    next_tabs AS (${tabCounts(tabs)}),
    base_tabs AS (
      SELECT tab.key AS place, tab.value, ${TAB_IDENTITY} AS identity,
        ROW_NUMBER() OVER (PARTITION BY ${TAB_IDENTITY} ORDER BY tab.key) AS occurrence
      FROM json_each(${base}) tab
    )
    SELECT json_group_array(json(kept)) FROM (
      SELECT CASE WHEN occurrence <= previous_tabs.copies AND occurrence <= next_tabs.copies
        THEN base_tabs.value END AS kept
      FROM base_tabs
      LEFT JOIN previous_tabs USING (identity)
      LEFT JOIN next_tabs USING (identity)
      ORDER BY place
    )
  )`
}

// Kept previews still occupy their old slots among the non-preview tabs.
// The skill places count against the tab list of the last save that sent them.
export const SAVE_WORKSPACE_VIEW = `INSERT INTO workspace_views
  (workspace_id, org_id, user_id, view_json, updated_at)
  WITH incoming(workspaceId, orgId, userId, patch, now, keepsPreviews, activePreview) AS (
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ), previous AS (
    SELECT incoming.*,
      CASE WHEN json_valid(stored.view_json) THEN stored.view_json ELSE '{}' END AS saved
    FROM incoming LEFT JOIN workspace_views stored
      ON stored.workspace_id = workspaceId AND stored.user_id = userId
  ), kept_previews AS (
    SELECT tab.value, tab.key AS oldIndex,
      tab.key + 1 - ROW_NUMBER() OVER (ORDER BY tab.key) AS place
    FROM previous, json_each(saved, '$.tabs') tab
    WHERE keepsPreviews AND tab.value ->> '$.kind' = 'preview'
  ), next_view AS (
    SELECT previous.*,
      CASE WHEN keepsPreviews THEN (
        SELECT json_group_array(json(value)) FROM (
          SELECT tab.value, tab.key AS place, 1 AS ordinary, tab.key AS oldIndex
          FROM json_each(patch, '$.tabs') tab
          UNION ALL
          SELECT value, place, 0, oldIndex FROM kept_previews
          ORDER BY place, ordinary, oldIndex
        )
      ) ELSE patch -> '$.tabs' END AS tabs,
      CASE WHEN EXISTS (
        SELECT 1 FROM kept_previews WHERE value ->> '$.port' = activePreview
      ) THEN json_object('kind', 'preview', 'port', activePreview)
      ELSE patch -> '$.activeTab' END AS activeTab,
      patch -> '$.temporaryTab' AS temporaryTab,
      json_patch(saved, patch) AS view,
      (SELECT tab.value FROM json_each(saved, '$.skillTabs') tab
        WHERE json_type(patch, '$.skillTabs') IS NULL
          AND json_type(patch, '$.temporaryTab') = 'object'
          AND (tab.value ->> '$.agent', tab.value ->> '$.name') =
             (saved ->> '$.temporarySkill.agent', saved ->> '$.temporarySkill.name')
        LIMIT 1) AS closedSkill
    FROM previous
  ), remaining AS (
    SELECT next_view.*,
      CASE WHEN closedSkill IS NULL THEN view -> '$.skillTabs' ELSE (
        SELECT json_group_array(json(value)) FROM (
          SELECT CASE WHEN tab.value ->> '$.place' > closedSkill ->> '$.place'
            THEN json_set(tab.value, '$.place', (tab.value ->> '$.place') - 1)
            ELSE tab.value END AS value
          FROM json_each(saved, '$.skillTabs') tab
          WHERE (tab.value ->> '$.agent', tab.value ->> '$.name') !=
              (closedSkill ->> '$.agent', closedSkill ->> '$.name')
          ORDER BY tab.key
        )
      ) END AS skillTabs
    FROM next_view
  )
  SELECT workspaceId, orgId, userId,
    json_set(json_patch(view, json_object(
      'skillTabs', json(skillTabs),
      'skillBaseTabs', json(CASE WHEN json_array_length(skillTabs) > 0 THEN
        CASE WHEN json_type(patch, '$.skillTabs') = 'array' THEN tabs
          ELSE ${retainedSkillBaseTabs('remaining.saved', 'remaining.tabs')} END END),
      'activeSkill', json(CASE WHEN activeTab = 'null' AND (closedSkill IS NULL OR
        (view ->> '$.activeSkill.agent', view ->> '$.activeSkill.name') IS NOT
        (closedSkill ->> '$.agent', closedSkill ->> '$.name'))
        THEN view -> '$.activeSkill' END),
      'temporarySkill', json(CASE WHEN temporaryTab = 'null' THEN view -> '$.temporarySkill' END)
    )), '$.tabs', json(tabs), '$.activeTab', json(activeTab), '$.temporaryTab', json(temporaryTab)),
    now
  FROM remaining WHERE ${activeOrgIdPredicate('remaining.orgId')}
  ON CONFLICT(workspace_id, user_id) DO UPDATE SET
    view_json = excluded.view_json, updated_at = excluded.updated_at
  RETURNING view_json AS viewJson`
