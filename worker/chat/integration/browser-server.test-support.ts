import { mkdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { routes } from '../../../src/app/router'
import { browserControls } from './browser-controls.test-support'
import { browserRunners } from './browser-runners.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
} from './outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'

/** A local browser uses production assets, routes and storage with fake external services. */
export async function startBrowserHarness(
  options: {
    port?: number
    assetsDirectory?: string
  } = {},
) {
  const port = options.port ?? 5178
  const assetsDirectory = resolve(options.assetsDirectory ?? 'dist/client')
  await stat(resolve(assetsDirectory, 'index.html'))
  const fixture = await createOuterRuntime(await outerWorkerBundle(), {
    appOrigin: `https://127.0.0.1:${port}`,
    port,
    https: true,
    assetsDirectory,
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        {
          agent: 'claude',
          model: 'test-claude',
          label: 'Example model',
          efforts: ['high'],
        },
      ]),
      CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({
        agent: 'claude',
        model: 'test-claude',
        effort: 'high',
      }),
      CONDUCTIVE_COMPUTER_MCP_URL: 'https://computer.conductive.test/mcp',
    },
  })
  await fixture.env.DB.prepare(
    `INSERT OR IGNORE INTO github_installations (id, account_login, account_type, created_at, suspended_at)
     VALUES (91, 'owner', 'User', 1, NULL)`,
  ).run()
  const runners = browserRunners(fixture)
  const controls = await browserControls(runners)
  await fixture.runtime.ready
  const directory = resolve(
    '.context/boat-native-remote-workspaces/8i/completion/browser',
  )
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, 'browser-harness.json'),
    JSON.stringify(
      {
        origin: fixture.env.APP_ORIGIN,
        workspaceUrl: `${fixture.env.APP_ORIGIN}${routes.workspace(OUTER_ORG, OUTER_WORKSPACE)}`,
        newWorkspaceUrl: `${fixture.env.APP_ORIGIN}${routes.newWorkspace(OUTER_ORG)}`,
        orgUrl: `${fixture.env.APP_ORIGIN}${routes.org(OUTER_ORG)}`,
        cookie: fixture.cookies.ownerCookie,
        machineOrigin: fixture.env.MACHINE_ORIGIN,
        workspaceToken: OUTER_TOKEN,
        orgId: OUTER_ORG,
        workspaceId: OUTER_WORKSPACE,
        workerEntry: 'worker/index.ts',
        normalTimers: true,
        fakeProviderControls: {
          origin: controls.origin,
          token: controls.token,
        },
      },
      null,
      2,
    ),
  )
  console.log(`The browser harness serves ${fixture.env.APP_ORIGIN}.`)
  console.log(
    `The local session and workspace are in ${directory}/browser-harness.json.`,
  )
  let finish: () => void = () => undefined
  const closed = new Promise<void>((resolve) => {
    finish = resolve
  })
  let closing: Promise<void> | undefined
  const close = () => {
    closing ??= (async () => {
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
      await runners.close()
      await controls.close()
      await fixture.dispose()
    })().finally(finish)
    return closing
  }
  const shutdown = () => {
    void close().catch((error: unknown) => console.error(error))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return { ...fixture, runners, controls, closed, close }
}
