import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { IMAGE_NODE_RUNTIME } from '../../worker/lifecycle/image-runtime'
import { shellQuote } from '../../worker/lifecycle/commands'

const sources: Readonly<Record<string, string>> = {
  Dockerfile: 'image/e2b/Dockerfile',
  'install-base.sh': 'image/e2b/install-base.sh',
  'install-tools.sh': 'image/e2b/install-tools.sh',
  'install-runtime.sh': 'image/install-runtime.sh',
  'port-relay.py': 'image/e2b/port-relay.py',
  'port-relay.service': 'image/e2b/port-relay.service',
}

/** Copy only public image inputs, independently of the caller's working tree. */
export async function templateContext(root: string): Promise<string> {
  const parent = join(root, '.context/e2b-backup-provider/template-builds')
  await mkdir(parent, { recursive: true, mode: 0o700 })
  const directory = await mkdtemp(join(parent, 'build-'))
  await Promise.all(
    Object.entries(sources).map(([name, source]) =>
      copyFile(join(root, source), join(directory, name)),
    ),
  )
  await writeFile(
    join(directory, 'runtime-settings.sh'),
    [
      `base_node_url=${shellQuote(IMAGE_NODE_RUNTIME.url)}`,
      `base_node_sha256=${shellQuote(IMAGE_NODE_RUNTIME.sha256)}`,
      `base_node_directory=${shellQuote(IMAGE_NODE_RUNTIME.directory)}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  )
  return directory
}
