import { mkdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { routes } from '../../../src/app/router'
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
  })
  await fixture.runtime.ready
  const directory = resolve('.context/chat-harness')
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, 'browser-harness.json'),
    JSON.stringify(
      {
        origin: fixture.env.APP_ORIGIN,
        workspaceUrl: `${fixture.env.APP_ORIGIN}${routes.workspace(OUTER_ORG, OUTER_WORKSPACE)}`,
        cookie: fixture.cookies.ownerCookie,
        machineOrigin: fixture.env.MACHINE_ORIGIN,
        workspaceToken: OUTER_TOKEN,
        orgId: OUTER_ORG,
        workspaceId: OUTER_WORKSPACE,
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
  const close = () => {
    process.off('SIGINT', close)
    process.off('SIGTERM', close)
    void fixture.dispose().finally(finish)
  }
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
  return { ...fixture, closed, close }
}
