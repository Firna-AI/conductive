// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { accountWithDefaults } from '../../app/default-logins.test-support'
import { routes } from '../../app/router'
import { ACCOUNT_PATHS } from '../../shared/account'
import {
  automationPath,
  automationsPath,
  type Automation,
  type AutomationResponse,
  type AutomationsResponse,
} from '../../shared/automations'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { automationFixtures } from '../../test-support/fixtures/automations'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp, wordsOf } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

function fixture(id: string): Automation {
  const automation = automationFixtures().automations.find(
    (item) => item.id === id,
  )
  if (!automation) throw new Error(`The fixtures have no automation ${id}.`)
  return automation
}

/** The buttons of the page that change the automation, in this order. */
function actions(view: HTMLElement): string[] {
  return ['Add trigger', 'Turn off', 'Delete', 'Save'].filter(
    (name) => queryByRole('button', name, view) !== null,
  )
}

/** The words of the main area of the page, without the Runs column. */
function page(view: HTMLElement): string {
  const main = view.querySelector('main')
  if (!main) throw new Error('The frame has no main area.')
  const form = main.cloneNode(true)
  if (!(form instanceof HTMLElement)) throw new Error('The copy is no element.')
  form.querySelector('aside')?.remove()
  return wordsOf(form)
}

describe('the automation page', () => {
  test('the owner gets the fields and Delete, and Save stays off until a change', async () => {
    const { view } = await openApp(
      new FakeApiServer(),
      routes.automation(org, 'review-prs'),
    )
    const name = await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    const unchanged = isOff(byRole('button', 'Save', view))
    await typeText(name, 'Review every pull request')
    expect({
      title: view.querySelector('main h1')?.textContent,
      active: byRole('switch', 'Active', view).getAttribute('aria-checked'),
      repository: queryByRole('button', 'Repository: acme/storefront', view),
      section: queryByRole(
        'button',
        'Section of the run workspaces: General',
        view,
      ),
      triggers: wordsOf(byRole('list', 'Triggers', view)),
      prompt: (byRole('textbox', 'Prompt', view) as HTMLTextAreaElement).value,
      logins: page(view).includes(
        'Runs use your Claude login and GitHub access.',
      ),
      actions: actions(view),
      unchanged,
      changed: isOff(byRole('button', 'Save', view)),
    }).toEqual({
      title: 'Review pull requests',
      active: 'true',
      repository: expect.anything(),
      section: expect.anything(),
      triggers: 'PR opened Authors PR pushed Authors',
      prompt:
        'Review this pull request for bugs, missing tests, and unclear names. Post your findings as one review on the pull request, and push no commits.',
      logins: true,
      actions: ['Add trigger', 'Delete', 'Save'],
      unchanged: true,
      changed: false,
    })
  })

  test("a new automation of a member whose default login is the org login names that login and the member's GitHub access under the prompt", async () => {
    const server = new FakeApiServer({ role: 'member' })
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults('member', { claude: 'org', codex: null }),
    )
    const { view } = await openApp(server, routes.newAutomation(org))
    await waitFor(
      () => queryByRole('textbox', 'Prompt', view),
      'the prompt of the new automation',
    )
    expect(page(view)).toContain(
      "Runs use Acme's Claude login and your GitHub access.",
    )
  })

  test('a member reads the automation without fields and without actions', async () => {
    const { view } = await openApp(
      new FakeApiServer({ role: 'member' }),
      routes.automation(org, 'review-prs'),
    )
    await waitFor(
      () => queryByText('Only Cal can change this automation.', view),
      'the automation as a member reads it',
    )
    expect({
      name: queryByRole('textbox', 'Name', view),
      words: page(view),
      actions: actions(view),
    }).toEqual({
      name: null,
      words:
        "Automations Review pull requests Automation Only Cal can change this automation. State Active Repository acme/storefront Section General By Cal Triggers PR opened PR pushed Prompt Review this pull request for bugs, missing tests, and unclear names. Post your findings as one review on the pull request, and push no commits. Opus 5.5 High Runs use Cal's Claude login and GitHub access.",
      actions: [],
    })
  })

  test.each([
    {
      runs: 'the org login',
      runLogin: { type: 'org', orgId: org },
      line: "Runs use Acme's Claude login and Cal's GitHub access.",
    },
    {
      runs: 'the own login of the owner',
      runLogin: { type: 'personal', userId: fixture('review-prs').owner.id },
      line: "Runs use Cal's Claude login and GitHub access.",
    },
    {
      runs: 'no login',
      runLogin: null,
      line: "Runs use Cal's Claude login and GitHub access.",
    },
  ] as const)(
    'a member reads the login of the runs that the server names, with $runs',
    async ({ runLogin, line }) => {
      const server = new FakeApiServer({ role: 'member' })
      server.json('GET', automationPath(org, 'review-prs'), {
        automation: fixture('review-prs'),
        runLogin,
      } satisfies AutomationResponse)
      const { view } = await openApp(
        server,
        routes.automation(org, 'review-prs'),
      )
      await waitFor(
        () => queryByText('Only Cal can change this automation.', view),
        'the automation as a member reads it',
      )
      expect(page(view).split('High ').at(-1)).toBe(line)
    },
  )

  test("an admin reads another member's automation, and turns it off", async () => {
    const server = new FakeApiServer()
    const id = 'dependency-updates'
    const { view } = await openApp(server, routes.automation(org, id))
    const note = 'Only Priya Raman can change this automation.'
    await waitFor(
      () => queryByText(`${note} You can turn it off or delete it.`, view),
      'the automation as an admin reads it',
    )
    const before = actions(view)
    server.json('PATCH', automationPath(org, id), {
      automation: { ...fixture(id), active: false, nextRunAt: null },
    })
    await press(byRole('button', 'Turn off', view))
    await waitFor(
      () => queryByText(`${note} You can delete it.`, view),
      'the automation after Turn off',
    )
    expect({
      before,
      after: actions(view),
      state: page(view).includes('State Off'),
      sent: await bodiesOf(server, 'PATCH', automationPath(org, id)),
    }).toEqual({
      before: ['Turn off', 'Delete'],
      after: ['Delete'],
      state: true,
      sent: [{ active: false }],
    })
  })

  test('Delete asks first, then deletes the automation and opens the Automations list without it', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await openApp(
      server,
      routes.automation(org, 'review-prs'),
    )
    await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the fields of the owner',
    )
    await press(byRole('button', 'Delete', view))
    const question = byRole('dialog', 'Delete Review pull requests?')
    const asked = wordsOf(question)
    const rest = automationFixtures().list.automations.filter(
      (automation) => automation.id !== 'review-prs',
    )
    // The server no longer lists the automation after the delete.
    server.json('GET', automationsPath(org), {
      automations: rest,
    } satisfies AutomationsResponse)
    await press(byRole('button', 'Delete automation', question))
    const list = await waitFor(
      () => queryByRole('list', 'Automations', view),
      'the Automations list',
    )
    expect({
      asked,
      address: navigation.href(),
      deleted: server.requests.filter(
        (request) =>
          request.method === 'DELETE' &&
          new URL(request.url).pathname === automationPath(org, 'review-prs'),
      ).length,
      listed: wordsOf(list).includes('Review pull requests'),
    }).toEqual({
      asked:
        'Delete Review pull requests? Its triggers and prompt are deleted. Its run workspaces stay. Cancel Delete automation',
      address: routes.automations(org),
      deleted: 1,
      listed: false,
    })
  })
})
