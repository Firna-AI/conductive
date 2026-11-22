import type { ServiceReport } from '../../src/shared/generated/ServiceReport'
import type { ServiceControlOutcome } from '../../src/shared/generated/ServiceControlOutcome'
import type { ServiceLogResult } from '../../src/shared/generated/ServiceLogResult'
import type { ServiceRawLogResult } from '../../src/shared/generated/ServiceRawLogResult'
import {
  SERVICE_APP_LOG_MAX_BYTES,
  SERVICE_APP_LOG_MAX_LINES,
} from '../../src/shared/services'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { agentOutputSecrets, secretTextFilter } from '../secrets/output-values'
import type { ChatStore } from '../chat/store'
import type { RunnerWorkspaceRecord } from '../chat/types'
import { displayPortReport } from '../chat/port-reports'

export async function serviceTextFilter(
  env: AppEnv,
  store: ChatStore,
  workspace: RunnerWorkspaceRecord,
) {
  return store.read(workspace.id, async (view) =>
    secretTextFilter([
      ...(await runningOutputSecrets(env, workspace)),
      ...(await agentOutputSecrets(env, view.secrets, workspace, view.now)),
    ]),
  )
}

export function filteredReport(
  report: ServiceReport,
  filter: (text: string) => string,
): ServiceReport {
  return {
    ...report,
    services: report.services.map((service) => {
      const label = displayPortReport({
        type: 'ports.updated',
        ports: [
          {
            port: 0,
            name: service.program === null ? null : filter(service.program),
            folder: service.folder === null ? null : filter(service.folder),
          },
        ],
      }).ports[0]
      return {
        ...service,
        name: filter(service.name),
        program: label.name,
        folder: label.folder,
      }
    }),
  }
}

export function filteredOutcome(
  outcome: ServiceControlOutcome,
  filter: (text: string) => string,
): ServiceControlOutcome {
  return outcome.state === 'failed'
    ? {
        ...outcome,
        error: { ...outcome.error, message: filter(outcome.error.message) },
      }
    : outcome
}

export function filteredLog(
  result: ServiceRawLogResult,
  filter: (text: string) => string,
): ServiceLogResult {
  if (result.state === 'failed')
    return {
      ...result,
      error: { ...result.error, message: filter(result.error.message) },
    }
  if (result.state !== 'ready') return result
  const complete = filter(result.text)
  const lines = complete.split('\n')
  // A trailing newline terminates the last line; it does not add an empty line.
  const keep = SERVICE_APP_LOG_MAX_LINES + (complete.endsWith('\n') ? 1 : 0)
  let text = lines.slice(-keep).join('\n')
  const bytes = new TextEncoder().encode(text)
  if (bytes.length > SERVICE_APP_LOG_MAX_BYTES) {
    let start = bytes.length - SERVICE_APP_LOG_MAX_BYTES
    while ((bytes[start] & 0xc0) === 0x80) start++
    text = new TextDecoder().decode(bytes.subarray(start))
  }
  return { state: 'ready', text, omitted: result.omitted || text !== complete }
}
