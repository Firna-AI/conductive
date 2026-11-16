// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/router'
import type { FilesTab } from '../../files/navigation'
import { filesHref } from '../../shell/workspace/files/files-address'
import { openTab } from '../../shell/workspace/wiring-test-kit'
import { click, settle } from '../../shell/test-mount'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('session selection in a suspended org', () => {
  it('leaves the shown file for the selected session with no write', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { org, workspace } = FAKE_IDS
    const file: FilesTab = {
      kind: 'file',
      path: FAKE_FILE_PATH,
      mode: 'preview',
    }
    const { view, navigation } = await openTab(
      server,
      filesHref(org, workspace, file),
    )
    expect(queryByRole('region', 'AddressForm.tsx', view)).not.toBeNull()
    const row = byLabel('Sessions and files', view)

    click(byRole('button', 'Address autocomplete', row))
    await settle()

    expect(navigation.href()).toBe(routes.workspace(org, workspace))
    expect(queryByRole('region', 'Chat', view)).not.toBeNull()
    expect(queryByRole('region', 'AddressForm.tsx', view)).toBeNull()
    expect(
      byRole('button', 'Address autocomplete', row).getAttribute(
        'aria-current',
      ),
    ).toBe('page')
    expect(
      server.requests.filter((request) => request.method !== 'GET'),
    ).toEqual([])
  })
})
