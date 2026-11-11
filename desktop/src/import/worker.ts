import { parentPort, workerData } from 'node:worker_threads'
import type { ImportJob, ImportLocationsInput } from './types.ts'
import { LocalImportError } from './types.ts'
import { sourceExists } from './source.ts'
import { scanSource } from './scan.ts'
import { ImportLocations } from './locations.ts'
import {
  buildStage,
  prepareStage,
  readStagePage,
  readStagePart,
  readStageResults,
  readStageLfsPage,
  recordStageLfsPage,
  reuseStage,
  sealStage,
} from './stage.ts'

interface Input {
  locations: ImportLocationsInput
  job: ImportJob
}
const input: Input = workerData
const abort = new AbortController()
parentPort?.on('message', () => abort.abort())
parentPort?.postMessage({ kind: 'ready' })
const { job } = input
const signal = abort.signal

async function run() {
  if (job.action === 'exists') return sourceExists(input.locations)
  const locations = await ImportLocations.create(input.locations)
  switch (job.action) {
    case 'scan':
      return scanSource(locations, signal)
    case 'row':
      return (
        (await scanSource(locations, signal, job.localWorkspaceId))[0] ?? null
      )
    case 'prepare':
      return prepareStage(
        locations,
        job.localWorkspaceId,
        job.scope,
        job.reservationId,
        signal,
      )
    case 'reuse':
      return reuseStage(
        locations,
        job.localWorkspaceId,
        job.scope,
        job.reservationId,
        signal,
      )
    case 'build':
      return buildStage(
        locations,
        job.stageId,
        job.facts,
        job.exclusions,
        signal,
      )
    case 'seal':
      return sealStage(locations, job.stageId, job.prerequisites, signal)
    case 'page':
      return readStagePage(locations, job.stageId, job.offset, signal)
    case 'part':
      return readStagePart(locations, job.stageId, job.part, signal)
    case 'results':
      return readStageResults(locations, job.stageId, signal)
    case 'lfs.page':
      return readStageLfsPage(locations, job.stageId, job.offset, signal)
    case 'lfs.available':
      await recordStageLfsPage(
        locations,
        job.stageId,
        job.factsId,
        job.page,
        job.available,
        signal,
      )
      return true
  }
}

void run()
  .then((value) => parentPort?.postMessage({ kind: 'result', value }))
  .catch((error: unknown) => {
    parentPort?.postMessage({
      kind: 'error',
      code: error instanceof LocalImportError ? error.code : 'read_failed',
    })
  })
  .finally(() => parentPort?.close())
