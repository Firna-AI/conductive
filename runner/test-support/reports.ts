import type {
  RunnerReportKind,
  RunnerReportRefresh,
} from '../../src/shared/runner'
import { emptySnapshot } from './wire'

export function refresh(
  kind: RunnerReportKind,
  commandId = `refresh-${kind}`,
): RunnerReportRefresh {
  return { type: 'report.refresh', commandId, kind }
}

export function reportSnapshot(paths: string[]) {
  const snapshot = emptySnapshot()
  snapshot.entries = paths.map((path) => ({
    path,
    name: 'file',
    kind: 'file',
    change: 'untracked',
  }))
  snapshot.identities = new Map(paths.map((path) => [path, 'new-content']))
  snapshot.readIdentities = new Map(snapshot.identities)
  snapshot.changes.files = paths.map((path) => ({
    path,
    change: 'untracked',
    added: 1,
    removed: 0,
    uncommitted: true,
  }))
  snapshot.changes.summary = {
    files: paths.length,
    added: paths.length,
    removed: 0,
  }
  return snapshot
}
