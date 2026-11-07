import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { MACHINE_PATHS } from '../src/shared/agent-tools'
import { LiveBoat } from './live-boat'
import {
  CheckError,
  object,
  shellQuote,
  text,
  type LiveConfiguration,
} from './live-input'

function validSample(
  line: string,
  placement: string,
  resumeId: string,
  config: LiveConfiguration,
): string {
  const sample = object(JSON.parse(line))
  if (
    sample.environment !== 'operator-resumed-sandbox' ||
    sample.placement !== placement ||
    sample.resumeId !== resumeId ||
    sample.agent !== config.choice.agent ||
    sample.model !== config.choice.model ||
    typeof sample.firstTextMs !== 'number' ||
    !Number.isFinite(sample.firstTextMs) ||
    sample.firstTextMs < 0
  )
    throw new CheckError('The measurement did not return a real-resume sample.')
  return `${JSON.stringify({
    environment: sample.environment,
    measuredAt: text(sample.measuredAt),
    placement,
    resumeId,
    agent: config.choice.agent,
    model: config.choice.model,
    firstTextMs: sample.firstTextMs,
  })}\n`
}

export async function measurePlacements(
  config: LiveConfiguration,
  boat: LiveBoat,
  sandboxId: string,
  root: string,
  cleanup: Set<string>,
) {
  const metadata = object(
    JSON.parse(
      await boat.command(
        sandboxId,
        [
          'set -eu',
          'set -a',
          '. /run/ascii-secrets/env.sh',
          'set +a',
          `${shellQuote(`${config.software}/node/bin/node`)} -e ${shellQuote('process.stdout.write(JSON.stringify({repository:process.env.CONDUCTING_REPOSITORY_DIR,machineOrigin:process.env.CONDUCTING_MACHINE_ORIGIN,runnerUrl:process.env.CONDUCTING_RUNNER_URL}))')}`,
        ].join('\n'),
      ),
    ),
  )
  const repository = text(metadata.repository)
  const machineOrigin = text(metadata.machineOrigin).replace(/\/$/, '')
  const runnerUrl =
    metadata.runnerUrl ?? `${machineOrigin}${MACHINE_PATHS.runner}`
  if (
    machineOrigin !== config.machineOrigin ||
    text(runnerUrl).replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') !==
      `${config.machineOrigin}${MACHINE_PATHS.runner}`
  )
    throw new CheckError(
      'The runner URL does not match LIVE_MACHINE_ORIGIN and the shared runner route.',
    )
  const files: string[] = []
  for (const placement of ['home', 'system'] as const) {
    const id = await boat.fork(sandboxId, placement)
    cleanup.add(id)
    await boat.ready(id)
    const destination = text(
      (
        await boat.command(
          id,
          [
            'set -eu',
            placement === 'home'
              ? 'measurement_dir="$HOME/.runner-first-start/software"'
              : 'measurement_dir=/opt/runner-first-start/software',
            'sudo -n install -d -m 755 -o user -g user "$measurement_dir"',
            `cp -R --preserve=mode,timestamps ${shellQuote(`${config.software}/.`)} "$measurement_dir/"`,
            'test -f "$measurement_dir/runner/measure.mjs"',
            'test -x "$measurement_dir/node/bin/node"',
            'printf \'%s\\n\' "$measurement_dir"',
          ].join('\n'),
        )
      ).trim(),
    )
    const file = join(config.output, `${placement}.jsonl`)
    await writeFile(file, '')
    files.push(file)
    for (let run = 1; run <= config.runs; run++) {
      await boat.stop(id)
      const resumeId = `${placement}-${run}-${randomUUID()}`
      await boat.resume(id, {
        CONDUCTING_MEASURE_MODE: 'agent',
        CONDUCTING_MEASURE_AGENT: config.choice.agent,
        CONDUCTING_MEASURE_MODEL: config.choice.model,
        CONDUCTING_MEASURE_LOGIN: config.login,
        CONDUCTING_MEASURE_LOGIN_KIND: config.loginKind,
        CONDUCTING_MEASURE_PLACEMENT: placement,
        CONDUCTING_MEASURE_RESUME_ID: resumeId,
        CONDUCTING_COMPUTER_MCP_URL: config.computerMcpUrl,
        CONDUCTING_REPOSITORY: repository,
      })
      const output = await boat.command(
        id,
        [
          'set -eu',
          'set -a',
          '. /run/ascii-secrets/env.sh',
          'set +a',
          `${shellQuote(`${destination}/node/bin/node`)} ${shellQuote(`${destination}/runner/measure.mjs`)}`,
        ].join('\n'),
      )
      if (
        [config.login, config.boatKey, config.cookie].some((secret) =>
          output.includes(secret),
        )
      )
        throw new CheckError(
          'The sample contained a credential. The script discarded it.',
        )
      await appendFile(
        file,
        validSample(output.trim(), placement, resumeId, config),
      )
      process.stdout.write(
        `Measured ${placement} resume ${run}/${config.runs}.\n`,
      )
    }
    await boat.stop(id)
    await boat.remove(id)
    cleanup.delete(id)
  }
  const compared = spawnSync(
    process.execPath,
    [join(root, 'dist/runner/compare.mjs'), ...files],
    { encoding: 'utf8' },
  )
  if (compared.status !== 0)
    throw new CheckError('The runner comparison command failed.')
  const comparison = object(JSON.parse(compared.stdout))
  if (
    !Array.isArray(comparison.comparisons) ||
    comparison.comparisons.length !== 1
  )
    throw new CheckError('The measurements did not produce one comparison.')
  const result = object(comparison.comparisons[0])
  if (!['home', 'system', 'tie'].includes(text(result.faster)))
    throw new CheckError(
      'The comparison needs at least three distinct resumes per placement.',
    )
  await writeFile(
    join(config.output, 'comparison.json'),
    `${JSON.stringify(comparison, null, 2)}\n`,
  )
  return { faster: result.faster, samplesPerPlacement: config.runs }
}
