import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { CheckError } from '../live-input'
import {
  checkFirstRestore,
  checkResume,
  installProbeImage,
} from './live-builds'
import { requireFlags } from './live-command'
import { e2bConfiguration, e2bRequiredInputs } from './live-input'
import { checkOldAlias, checkPreview } from './live-preview'
import {
  checkBoot,
  checkEnvironment,
  checkResources,
  probe,
} from './live-probes'
import { openLiveProvider, type LiveProvider } from './live-provider'
import { LiveResources } from './live-resources'

export async function e2bLiveMain(
  root: string,
  arguments_: readonly string[],
): Promise<void> {
  if (arguments_.includes('--help')) {
    process.stdout.write(
      `Usage: node image/live-check.mjs --provider=e2b [--prepare]\nRequired: ${e2bRequiredInputs.join(', ')}\nOptional: LIVE_E2B_STATE_DIR, LIVE_OUTPUT. Keep state under .context/ and use the same state key when reopening it.\nThis mode builds two clean disposable images and checks a probe sandbox. It runs no agent or app workspace.\n--prepare uses no credential or provider. Real checks require EU and filesystem-only project support.\n`,
    )
    return
  }
  await Promise.all(
    ['runner', 'relay', 'measure', 'compare'].map((name) =>
      access(join(root, 'dist/runner', `${name}.mjs`)),
    ),
  )
  if (arguments_.includes('--prepare')) {
    await access(join(root, 'migrations/202611101110_e2b_provider_state.sql'))
    process.stdout.write(
      'E2B preparation passed. Runner and preview relay bundles, provider migration, and script dependencies are available.\nNo real sandbox, image, provider, or agent was used.\n',
    )
    return
  }
  const config = e2bConfiguration(process.env, root)
  await mkdir(config.output, { recursive: true, mode: 0o700 })
  const options = {
    accountId: config.accountId,
    apiKey: config.apiKey,
    domain: config.domain,
    templateId: config.templateId,
    encryptionKey: config.encryptionKey,
    fetch: (request: Request) => fetch(request),
  }
  const resources = new LiveResources(config)
  let session: LiveProvider | null = null
  let cleanupIncomplete: boolean
  const report: Record<string, unknown> = {
    scope: 'e2b-image-runtime',
    environment: 'real-e2b-provider',
    completed: false,
    templateId: config.templateId,
  }
  try {
    session = await openLiveProvider(root, config.stateDirectory, options)
    const first = await resources.create(session.provider, 'first')
    const base = await probe(session.provider, first, 'base')
    report.base = requireFlags(base, [
      'ubuntu',
      'tools',
      'node24',
      'python312',
      'dockerContainer',
      'noComputer',
    ])
    report.first = await installProbeImage(
      session.provider,
      first,
      config,
      'first',
    )
    const imageA = await resources.snapshot(session.provider, first, 'image-a')
    await session.provider.delete(first)
    await session.close()
    session = null
    session = await openLiveProvider(root, config.stateDirectory, options)
    const second = await resources.create(session.provider, 'second', imageA)
    report.firstRestore = await checkFirstRestore(session.provider, second)
    report.second = await installProbeImage(
      session.provider,
      second,
      config,
      'second',
    )
    const imageB = await resources.snapshot(session.provider, second, 'image-b')
    await session.provider.delete(second)
    const id = await resources.create(session.provider, 'probe', imageB)
    report.resources = await checkResources(session.provider, config, id)
    report.boot = await checkBoot(session.provider, id)
    const markers = await probe(session.provider, id, 'markers')
    report.markers = requireFlags(markers, [
      'diskMarkers',
      'runtimeMarkersGone',
    ])
    report.environment = await checkEnvironment(session.provider, id, 'probe')
    const preview = await checkPreview(session.provider, id)
    report.preview = preview
    report.resume = await checkResume(session.provider, id)
    report.resumedBoot = await checkBoot(session.provider, id)
    report.oldAlias = await checkOldAlias(
      session.provider,
      id,
      config.domain,
      preview.outerPort,
    )
    report.resumedPreview = await checkPreview(session.provider, id)
    report.images = { first: imageA, second: imageB }
    report.completed = true
  } catch (error) {
    report.error =
      error instanceof CheckError
        ? error.message
        : 'The E2B live check failed. Raw provider and command output was suppressed.'
    throw error
  } finally {
    let pending = resources.entries
    try {
      session ??= await openLiveProvider(root, config.stateDirectory, options)
      pending = await resources.cleanup(session.cleanupProvider)
    } catch {
      report.cleanupError =
        'The E2B cleanup could not finish. Keep the local D1 state.'
    }
    report.cleanupNeeded = pending
    cleanupIncomplete = pending.length > 0 || Boolean(report.cleanupError)
    if (cleanupIncomplete) report.completed = false
    await session?.close().catch(() => {
      report.cleanupError = 'The local E2B state runtime could not close.'
      report.completed = false
      cleanupIncomplete = true
    })
    await writeFile(
      join(config.output, 'summary.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      { mode: 0o600 },
    )
    process.stdout.write(
      `Saved E2B image/runtime results under ${config.output}.\n`,
    )
  }
  if (cleanupIncomplete)
    throw new CheckError(
      'E2B cleanup is incomplete. Read cleanupNeeded and keep the state directory.',
    )
}
