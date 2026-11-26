import { explanations } from '../fixtures/explanations'
import { workspaceSessions } from '../fixtures/sessions'
import { paths } from '../paths'
import { explainPaths } from './explainPaths'
import { defineWalk } from './walks'
import { codeTabKey } from './workspaceTabRow'

const [firstSession, secondSession] = workspaceSessions

/**
 * The late request for PROD_DATABASE_URL of Address autocomplete, the first
 * session, while the screen shows another tab: the second session, or the
 * code file that stays open. Each tab opens the screen of that tab with the
 * same open request, so the mark stays on the tab of the first session.
 */
export const otherTabWalk = defineWalk({
  view: 'browser',
  states: {
    second: {
      page: 'app/tabs/needs-input',
      props: {
        tab: 'later-session',
        conversation: 'second-session',
        otherRequest: 'first-session',
      },
    },
    first: {
      page: paths.secretLate,
      props: { tab: 'session', conversation: 'secret-late' },
    },
    file: {
      page: 'app/tabs/needs-input/file',
      props: {
        tab: 'code',
        conversation: 'secret-late',
        files: 'all',
        focus: 'files',
      },
    },
  },
  tabs: {
    [firstSession.key]: 'first',
    [secondSession.key]: 'second',
    [codeTabKey]: 'file',
  },
})

/**
 * The explanation of Cal while its follow-up waits for a member to allow a
 * run with a secret: the parent chat with its marks, and the tab of the
 * explanation, with the request above its composer. The waiting chat of the
 * popover is the chat of the tab too.
 */
export const explainWaitsWalk = defineWalk({
  view: 'browser',
  states: {
    marks: {
      page: explainPaths.marks,
      props: {
        tab: 'session',
        banner: 'checks-running',
        explainMarks: 'states',
        explainSession: 'waiting',
      },
    },
    tab: {
      page: explainPaths.tab,
      slug: 'waiting',
      props: {
        tab: 'explanation',
        conversation: 'explanation-waiting',
        banner: 'checks-running',
        explainMarks: 'states',
        explainSession: 'waiting',
      },
      answers: [],
    },
  },
  tabs: { [firstSession.key]: 'marks', [explanations.count.key]: 'tab' },
})

/** The walks that name the page that each tab opens. */
export const tabWalks = [otherTabWalk, explainWaitsWalk]
