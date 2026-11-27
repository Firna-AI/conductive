import { writeFile } from 'node:fs/promises'

import { expect, it, onTestFinished } from 'vitest'

import {
  credentialScript,
  launcherScript,
  sessionServerScript,
} from './scripts'
import { runScript, scriptFixture } from './scripts.test-support'

it('loads recorded folder variables on shell server restart and refreshes them on attach', async () => {
  const fixture = await scriptFixture()
  onTestFinished(fixture.dispose)
  const { options } = fixture
  await writeFile(
    options.repositoryFoldersFile,
    [
      'CONDUCTIVE_REPOSITORY_BILLING_DIR=/home/user/code/billing',
      'CONDUCTIVE_REPOSITORY_OTHER_DIR=/home/user/code/nested/folder',
      'CONDUCTIVE_LAUNCH_TEST=/home/user/code/ignored',
      '',
    ].join('\n'),
  )
  await writeFile(
    fixture.multiplexer,
    `#!/bin/sh
case "\${4-}" in
  set-environment) printf 'set %s=%s\\n' "$6" "$7" ;;
  new-session) printf 'attached\\n' ;;
  *) printf '%s|%s\\n' "\${CONDUCTIVE_REPOSITORY_BILLING_DIR-}" "$CONDUCTIVE_LAUNCH_TEST" ;;
esac
`,
  )
  const server = await runScript(sessionServerScript(options))
  expect(server).toEqual({
    code: 0,
    stdout: '/home/user/code/billing|workspace environment\n',
    stderr: '',
  })
  await writeFile(fixture.terminal, '#!/bin/sh\nshift 8\nexec "$@"\n')
  expect((await runScript(credentialScript(options))).code).toBe(0)
  expect(await runScript(launcherScript(options))).toEqual({
    code: 0,
    stdout:
      'set CONDUCTIVE_REPOSITORY_BILLING_DIR=/home/user/code/billing\nattached\n',
    stderr: '',
  })
})
