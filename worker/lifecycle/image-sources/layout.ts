import type { AppEnv } from '../../env'
import type { PrepareImageSources } from '../image-builds'
import { legacyRepositoryLocations } from '../repository-locations'
import { sourceLayoutCommand } from './layout-command'
import { isolatedSourceCommand } from './native-command'
import {
  saveMemoryBudget,
  saveMemoryStatus,
  setRunPhase,
  type SourceRun,
} from './run-data'
import { sourceCommandSucceeded } from './schedule'
import { refusedSourceStart } from './source-commands'

export async function advanceSourceLayout(
  env: AppEnv,
  input: Parameters<PrepareImageSources>[0],
  run: SourceRun,
) {
  if (run.phase === 'layout-ready') {
    const locations =
      input.repositoryLocations ?? legacyRepositoryLocations(input.repositories)
    await setRunPhase(env.DB, run.buildId, 'layout-starting')
    try {
      const started = await input.commands.start(
        isolatedSourceCommand(
          [
            sourceLayoutCommand(
              input.buildId,
              locations,
              input.previousRepositoryLocations ?? locations,
            ),
            "/usr/bin/awk '/^MemAvailable:/ { print; found=1; exit } END { if (!found) exit 1 }' /proc/meminfo",
          ].join('\n'),
          true,
        ),
      )
      await setRunPhase(env.DB, run.buildId, 'layout', started.processId)
    } catch (error) {
      if (refusedSourceStart(error))
        await setRunPhase(env.DB, run.buildId, 'layout-ready')
      throw error
    }
    return
  }
  if (run.processId === null) throw new Error('Missing source process')
  const status = await input.commands.status(run.processId, run)
  const text = await saveMemoryStatus(env.DB, run, status)
  if (status.running || status.more) return
  if (!sourceCommandSucceeded(status))
    throw new Error('The source command failed')
  const match = text.match(/^MemAvailable:\s+(\d+) kB\s*$/u)
  const available = match ? Number(match[1]) * 1024 : NaN
  if (!Number.isSafeInteger(available) || available < 0)
    throw new Error('Memory budget is not available')
  await saveMemoryBudget(env.DB, run.buildId, Math.floor(available / 2))
}
