export function workspaceNameColumn(table: 'w' | 'workspaces'): string {
  return `NULLIF(${table}.name, '') AS name`
}
