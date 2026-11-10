import { setupBackendTests } from './backend-test-hooks'

export function setupFirstBuildTests() {
  const fixtureForTest = setupBackendTests()
  return async () => {
    const fixture = fixtureForTest()
    const db = fixture.runtime.env.DB
    await db.batch([
      db
        .prepare(
          "UPDATE org_images SET image_build_id = NULL, image_name = NULL WHERE org_id = ? AND provider_account = 'boat'",
        )
        .bind(fixture.org.id),
      db
        .prepare('DELETE FROM image_builds WHERE org_id = ?')
        .bind(fixture.org.id),
    ])
    return fixture
  }
}
