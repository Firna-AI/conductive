import { chmod, mkdir, writeFile } from 'node:fs/promises'

import { terminalInstallCommand } from './service'
import { runScript, scriptFixture } from './scripts.test-support'

export async function installationFixture() {
  const fixture = await scriptFixture()
  const bin = `${fixture.root}/bin`
  const installed = `${fixture.root}/installed`
  const units = `${fixture.root}/units`
  const packages = `${fixture.root}/packages`
  await mkdir(bin)
  await mkdir(units)
  const programs = {
    sudo: `#!/bin/sh
[ "$1" != -n ] || shift
[ "$1" != -- ] || shift
exec "$@"
`,
    'apt-get': `#!/bin/sh
printf '%s\\n' "$*" >> '${packages}'
`,
    systemctl: `#!/bin/sh
printf '%s\\n' "$*" >> '${units}/systemctl.log'
`,
  }
  for (const [name, content] of Object.entries(programs)) {
    await writeFile(`${bin}/${name}`, content)
    await chmod(`${bin}/${name}`, 0o700)
  }
  const command = terminalInstallCommand()
    .replaceAll('/usr/local/lib/conductive', installed)
    .replaceAll('/etc/systemd/system', units)
    .replaceAll('/run/conductive-terminal', fixture.options.runtimeDirectory)
    .replaceAll('/run/ascii-secrets/env.sh', fixture.options.environmentFile)
    .replaceAll('/usr/bin/ttyd', fixture.terminal)
    .replaceAll('/usr/bin/tmux', fixture.multiplexer)
  return {
    ...fixture,
    installed,
    units,
    packages,
    install: () =>
      runScript(command, false, {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
      }),
  }
}
