import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { readWorkspacePanes } from '../../shared/workspace-pane-input'
import { oneOf, record, text } from './json'

function readTab(value: unknown): WorkspaceTab {
  const source = record(value, 'tab')
  switch (source.kind) {
    case 'session':
      return { kind: 'session', sessionId: text(source.sessionId) }
    case 'diff':
      return { kind: 'diff', path: text(source.path) }
    default:
      return {
        kind: oneOf({ file: true })(source.kind),
        path: text(source.path),
        mode: oneOf({ preview: true, source: true })(source.mode),
      }
  }
}

export function readView(value: unknown): WorkspaceView {
  const view = record(record(value, 'view response').view, 'view')
  return {
    ...readWorkspacePanes(view, readTab),
    fileList: oneOf({ all: true, changes: true, checks: true })(view.fileList),
    tool: oneOf({ terminal: true, preview: true, desktop: true })(view.tool),
  }
}
