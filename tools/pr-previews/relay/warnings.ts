import type { RelayWarning } from './env.ts'

export function warnRelay(warning: RelayWarning): void {
  console.warn({
    kind: warning.kind,
    preview: warning.preview,
    status: warning.status,
  })
}
