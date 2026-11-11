import type { Miniflare } from 'miniflare'

import type { NativeWorkspaceApi } from './native-workspace-api'
import type { NativeRemote } from './native-values'

export async function forceNativeEviction(
  runtime: Miniflare,
  workerName: string,
  exportName: string,
  name: string,
  controls: NativeRemote<NativeWorkspaceApi>['controls'],
): Promise<string> {
  const previous = await controls.instanceId()
  let rejected = false
  let failure: unknown
  try {
    await controls.abortFixture()
  } catch (error) {
    rejected = true
    failure = error
  }
  if (!rejected)
    throw new Error('The native reset did not disconnect its caller.')
  const restarted = await controls.instanceId()
  if (restarted === previous)
    throw new Error('The native reset kept the previous object instance.', {
      cause: failure,
    })
  await runtime.unsafeEvictDurableObject(workerName, exportName, {
    name,
    webSockets: 'close',
  })
  return restarted
}
