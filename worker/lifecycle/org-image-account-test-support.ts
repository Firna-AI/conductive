import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE, type backendFixture } from './backend-test-support'
import { seedPublishedImage } from './published-image-test-support'

export const SECONDARY_IMAGE_ACCOUNT = 'boat-second'

export async function seedSecondaryOrgImage(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
): Promise<void> {
  fixture.boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  fixture.runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    [SECONDARY_IMAGE_ACCOUNT]: {
      kind: 'boat',
      orgId: 'second-org',
      apiKey: 'boat-second',
    },
  })
  await seedPublishedImage(fixture.runtime.env.DB, {
    orgId: fixture.org.id,
    buildId: 'secondary-image-build',
    imageName: 'secondary-image',
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    repositories: [
      {
        id: fixture.repositoryId,
        orgId: fixture.org.id,
        fullName: 'example/repository',
        defaultBranch: 'secondary-main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME - 1,
  })
}
