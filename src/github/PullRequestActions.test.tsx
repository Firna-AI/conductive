// @vitest-environment happy-dom

import { act, type MouseEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, onTestFinished, vi } from 'vitest'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import { FAKE_TIME } from '../test-support/fixtures/core'
import type { GitHubState } from './githubStore'
import { PullRequestBar } from './PullRequestBar'
import { PullRequestRow } from './PullRequestRow'
import { controlsOf, feedOf, snapshotOf } from './testing'

function mountActions(view: 'desktop' | 'phone', state: GitHubState) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  const retry = vi.fn()
  const onAction = vi.fn((action: BarAction) => action)
  const onOpenChecks = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
  })
  const github = feedOf(state, retry)
  const controls = controlsOf(github, {}, onAction)
  onTestFinished(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })
  act(() => {
    root.render(
      view === 'desktop' ? (
        <PullRequestBar controls={controls} github={github} now={FAKE_TIME} />
      ) : (
        <PullRequestRow
          checksHref="/checks"
          controls={controls}
          github={github}
          onOpenChecks={onOpenChecks}
        />
      ),
    )
  })
  return { container, retry, onAction, onOpenChecks }
}

function buttonNamed(container: HTMLElement, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === name,
  )
  if (!button) throw new Error(`The ${name} button is missing.`)
  return button
}

it('calls only retry once when the desktop Try again button is clicked', () => {
  const actions = mountActions('desktop', { status: 'error', message: null })
  const button = buttonNamed(actions.container, 'Try again')

  act(() => button.click())

  expect(actions.retry).toHaveBeenCalledTimes(1)
  expect(actions.onAction).not.toHaveBeenCalled()
  expect(actions.onOpenChecks).not.toHaveBeenCalled()
})

it('presses only the Archive action once when the desktop Archive button is clicked', () => {
  const actions = mountActions('desktop', {
    status: 'ready',
    snapshot: snapshotOf('merged'),
  })
  const button = buttonNamed(actions.container, 'Archive')

  act(() => button.click())

  expect(actions.onAction.mock.calls).toEqual([
    [{ kind: 'archive', disabled: false }],
  ])
  expect(actions.retry).not.toHaveBeenCalled()
  expect(actions.onOpenChecks).not.toHaveBeenCalled()
})

it('calls only retry once when the phone Try again button is clicked', () => {
  const actions = mountActions('phone', { status: 'error', message: null })
  const button = buttonNamed(actions.container, 'Try again')

  act(() => button.click())

  expect(actions.retry).toHaveBeenCalledTimes(1)
  expect(actions.onAction).not.toHaveBeenCalled()
  expect(actions.onOpenChecks).not.toHaveBeenCalled()
})

it('calls only onOpenChecks once when the phone Checks link is clicked', () => {
  const actions = mountActions('phone', {
    status: 'ready',
    snapshot: snapshotOf('ready-to-merge'),
  })
  const link = [...actions.container.querySelectorAll('a[href]')].find(
    (element) => element.textContent?.includes('Show the checks'),
  )
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error('The Checks link is missing.')
  }

  act(() => link.click())

  expect(actions.onOpenChecks).toHaveBeenCalledTimes(1)
  expect(actions.retry).not.toHaveBeenCalled()
  expect(actions.onAction).not.toHaveBeenCalled()
})
