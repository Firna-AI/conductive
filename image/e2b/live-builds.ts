import { PREVIEW_INGRESS_PATH } from '../../src/shared/preview-ingress'
import { shellQuote } from '../../worker/lifecycle/commands'
import { installImageSoftware } from '../../worker/lifecycle/image-software'
import {
  readSavedScript,
  savedScriptCommand,
} from '../../worker/lifecycle/saved-script'
import type { SandboxProvider } from '../../worker/sandbox/provider'
import { privilegedCommand } from '../../worker/terminal/privileged'
import { installWorkspaceTools } from '../../worker/tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../../worker/tools/image-assets'
import {
  command,
  probeDirectory,
  probeRepository,
  ready,
  requireFlags,
} from './live-command'
import type { E2bLiveConfiguration } from './live-input'
import { probe } from './live-probes'
import { CheckError } from '../live-input'

export async function installProbeImage(
  provider: SandboxProvider,
  id: string,
  config: E2bLiveConfiguration,
  phase: 'first' | 'second',
) {
  await command(
    provider,
    id,
    `sudo -n install -d -m 700 -o user -g user ${probeDirectory}\nmkdir -p ${probeRepository}\ngit init -q ${probeRepository}`,
  )
  await installWorkspaceTools(WORKSPACE_TOOL_SOURCES, (source) =>
    provider.runCommand(id, privilegedCommand(source)),
  )
  await command(provider, id, installImageSoftware(config.software))
  await command(
    provider,
    id,
    savedScriptCommand(
      `${probeDirectory}/install.sh`,
      readSavedScript(
        `set -eu\ntest -d ${shellQuote(probeRepository)}\ntest -f /opt/conductive/software/runner/relay.mjs\n`,
      ),
      ['set -a', '. /run/ascii-secrets/env.sh', 'set +a'],
    ),
  )
  const installed = await probe(provider, id, 'installed')
  const facts = requireFlags(installed, [
    'servicesEnabled',
    'runnerGated',
    'terminalGated',
  ])
  const marked = await probe(provider, id, 'mark', [phase])
  requireFlags(marked, ['markersWritten'])
  return facts
}

export async function checkFirstRestore(provider: SandboxProvider, id: string) {
  await command(
    provider,
    id,
    `test -f ${probeRepository}/image-first && test ! -e ${probeDirectory}/image-first`,
  )
  return { firstDiskSurvives: true, firstRuntimeGone: true }
}

export async function checkResume(provider: SandboxProvider, id: string) {
  const started = await provider.startCommand(
    id,
    "exec /usr/bin/python3 -c 'import signal;signal.pause()'",
  )
  const before = await provider.getCommandStatus(id, started.processId, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  if (!before.running) throw new CheckError('The owned E2B job did not start.')
  await probe(provider, id, 'mark', ['pause'])
  await provider.stop(id)
  await ready(provider, id, true)
  await provider.resume(
    id,
    {
      CONDUCTIVE_REPOSITORY_DIR: probeRepository,
      CONDUCTIVE_LIVE_PROBE: 'resumed',
    },
    1800,
  )
  await ready(provider, id)
  const after = await provider.getCommandStatus(id, started.processId, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  if (after.state !== 'lost')
    throw new CheckError(
      'The old E2B command survived a filesystem-only resume.',
    )
  const markers = await probe(provider, id, 'markers')
  const markerFacts = requireFlags(markers, [
    'diskMarkers',
    'runtimeMarkersGone',
  ])
  const environment = await probe(provider, id, 'environment', [
    'resumed',
    PREVIEW_INGRESS_PATH,
  ])
  const environmentFacts = requireFlags(environment, [
    'envCurrent',
    'envPrivate',
    'ingressPrivate',
  ])
  return { oldJobLost: true, ...markerFacts, ...environmentFacts }
}
