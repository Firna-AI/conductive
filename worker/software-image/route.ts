import type { AppDependencies, AppEnv } from '../env'
import { latestSoftwareRelease } from '../lifecycle/software-release'
import { requestSoftwareImage } from './build'
import { deployTokenDigest } from './deploy-gate'
import { boundedSoftwareImagePoll } from './poll'

export const SOFTWARE_IMAGE_PATH = '/v1/deploy/software-image'

export async function handleSoftwareImage(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response> {
  return boundedSoftwareImagePoll(
    env,
    dependencies,
    execution,
    async (runtime) => {
      const digest = await deployTokenDigest(request, env, dependencies.now())
      return requestSoftwareImage(
        runtime,
        await latestSoftwareRelease(env, runtime.dependencies.fetch),
        digest,
      )
    },
  )
}
