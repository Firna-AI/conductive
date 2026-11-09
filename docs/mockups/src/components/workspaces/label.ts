/**
 * The label of a workspace number, such as `W-395`. It is the same in
 * every org, and it is only a label: links, messages, and the agent tools
 * name a workspace by its ID.
 */
export function workspaceLabel(number: number): string {
  return `W-${number}`
}
