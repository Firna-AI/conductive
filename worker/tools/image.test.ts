import { expect, it } from 'vitest'

import { loadWorkspaceToolSources } from '../../tools/image-assets'
import { installWorkspaceTools } from './image'

it('reports failed or incomplete image installation instead of accepting it', async () => {
  const sources = await loadWorkspaceToolSources()
  for (const result of [
    {
      exitCode: 1,
      stdout: '',
      stderr: 'private install details',
      timedOut: false,
    },
    { exitCode: null, stdout: '', stderr: '', timedOut: true },
  ]) {
    await expect(
      installWorkspaceTools(sources, async () => result),
    ).rejects.toThrow('The workspace tools could not be installed.')
  }
})
