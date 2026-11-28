// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import type { DropTarget } from './drop-target'
import { queuedList, type QueueWrite } from './queue-list-test-kit'
import { layOut, mouse, noActions, rowLink } from './row-drag-test-kit'
import { SectionList } from './SectionList'

describe('the Merge queue group as a drop target', () => {
  test('a drag of a row while no queue has entries shows no group, so the sections keep their places, and adds nothing', async () => {
    const app = await startedApp(new FakeApiServer())
    const writes: QueueWrite[] = []
    const { groups, queue } = queuedList([], writes)
    const moves: { workspaceId: string; target: DropTarget }[] = []
    const view = mountScreen(
      app,
      <SectionList
        actions={noActions}
        archived={groups.archived}
        groups={groups.sections}
        move={(workspaceId, target) => moves.push({ workspaceId, target })}
        now={FAKE_TIME}
        queue={queue}
        readOnly={false}
        selectedId={null}
        variant="sidebar"
      />,
    )
    const sections = () =>
      [...view.querySelectorAll('section')].map((section) =>
        section.getAttribute('aria-label'),
      )
    const before = sections()
    layOut(view, 'General', 0, [
      'email-dark-mode',
      'invoice-fonts',
      'pricing-copy',
    ])
    layOut(view, 'Checkout', 120, ['webhook-retries'])
    mouse(rowLink(view, 'webhook-retries'), 'pointerdown', { clientY: 150 })
    mouse(window, 'pointermove', { clientY: 156 })
    const during = sections()
    mouse(window, 'pointermove', { clientY: 25 })
    mouse(window, 'pointerup', { clientY: 25, buttons: 0 })
    expect({ during, writes, moves }).toEqual({
      during: before,
      writes: [],
      moves: [
        {
          workspaceId: 'webhook-retries',
          target: { sectionId: groups.sections[0]?.section.id, index: 0 },
        },
      ],
    })
    expect(before).not.toContain('Merge queue')
  })
})
