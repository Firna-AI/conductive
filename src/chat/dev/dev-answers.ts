import type { DevOptions } from './dev-options'
import { devShots } from './dev-pictures'
import { longAnswer, proseAnswer, prosePlan } from './dev-prose-answers'

/** The browser projects of the end-to-end tests in the wide table. */
const browsers = [
  'Chromium',
  'Firefox',
  'WebKit',
  'Edge',
  'Android',
  'iPhone',
  'iPad',
]

/** A row of the wide table: a test that passed in every browser project. */
function passed(test: string, retries: string, time: string): string {
  const cells = [`\`${test}\``, ...browsers.map(() => 'Passed'), retries, time]
  return `| ${cells.join(' | ')} |\n`
}

/**
 * An answer with three tables: the resources of the machine, the sizes of
 * the bundles with a short row, and a wide table of test runs. Each line is
 * one part, so each header row shows as text until its separator row
 * arrives. One row of the first table arrives in two parts.
 */
const tables = [
  'I checked the machine, the bundles, and the end-to-end tests.\n\n',
  '| Resource | Value |\n',
  '|---|---|\n',
  '| Virtualization | KVM virtual machine |\n',
  '| CPU | 4 vCPUs, 1 thread per core, AMD Ryzen 7 9700X |\n',
  '| Memory | 7.8 GiB total, about 6.0 GiB',
  ' available, plus 2.0 GiB swap |\n',
  '| Disk (`/home`) | 79 GiB total, 54 GiB free |\n',
  '| OS | Linux 6.8.0-117-generic |\n\n',
  'The checkout page grows by 7 KB. The places proxy runs on the server, so the browser never loads it.\n\n',
  '| Bundle | Main | This branch | Change |\n',
  '| --- | ---: | ---: | ---: |\n',
  '| `checkout` | 182 KB | 189 KB | +7 KB |\n',
  '| `account` | 96 KB | 96 KB | 0 KB |\n',
  '| `api/places` | Server only |\n\n',
  'All 21 runs pass. One WebKit run passed on its second try, because a suggestion came late.\n\n',
  `| Test | ${browsers.join(' | ')} | Retries | Time |\n`,
  `| --- | ${browsers.map(() => ':---:').join(' | ')} | ---: | ---: |\n`,
  passed('checkout.spec.ts:14', '0', '41s'),
  passed('checkout.spec.ts:38', '1', '52s'),
  passed('checkout.spec.ts:61', '0', '23s'),
]

/**
 * A review with two choices under headings: a section at level 2, a
 * heading for each choice at level 3 with bold labels under it, and a
 * smaller heading at level 4. Each part is one line or one blank line.
 */
const headings = [
  'I checked the form, the hook, and the tests. Two choices need your answer.\n\n',
  '## Needs your answer\n\n',
  '### 1. Lookups can pass the rate limit\n\n',
  '- **Severity:** Medium. **Effort:** Small.\n',
  '- **Problem:** Each key press sends a lookup to `/api/places`.\n',
  '- **Recommendation:** Wait 250 ms after the last key press.\n\n',
  '#### How I checked\n\n',
  'The end-to-end test that types an address fast got 3 responses with status `429`.\n\n',
  '### 2. Suggestions cover the manual fields\n\n',
  '- **Severity:** Low. **Effort:** Small.\n',
  '- **Problem:** On a phone, the suggestions cover the city and postcode fields.\n',
  '- **Recommendation:** Move the fields down while the list is open.',
]

/**
 * Task lists, as the mockups draw them at `app/chat/lists/tasks`: the plan
 * holds two open tasks, so its message line in the folded work shows two
 * empty boxes, and the answer holds two done tasks and an open task with a
 * note in a list under it. Each part is one line or one blank line.
 */
const taskPlan = [
  'Two changes to make:\n\n',
  '- [ ] Debounce the lookups\n',
  '- [ ] Move the fields under the list',
]

const taskAnswer = [
  'I pushed both changes:\n\n',
  '- [x] Each lookup waits 250 ms after the last key press, in `useAddressAutocomplete`.\n',
  '- [x] On a phone, the fields move down under the list.\n',
  '- [ ] Priya approves the changes.\n',
  '  - She asked to see the phone test first.\n\n',
  'Only her approval is left.',
]

/**
 * An answer with the screenshots of the context folder as Markdown images:
 * two pictures side by side, a plain link and an image that stay links, an
 * image whose read fails, and an image in a table cell, which keeps its
 * link. Each part is one line or one blank line.
 */
const pictures = [
  'I moved the list of suggestions under the postcode field, so it no longer covers the field.\n\n',
  `Before and after: ![Postcode field before the fix](${devShots.before}) ![Postcode field after the fix](${devShots.after})\n\n`,
  `The same screenshot as a link: [after the fix](${devShots.after}). An older screenshot: ![Old checkout](${devShots.lost}).\n\n`,
  '| Screen | Screenshot |\n',
  '| --- | --- |\n',
  `| Phone | ![Phone after the fix](${devShots.after}) |`,
]

/**
 * What a scripted turn writes, in parts: its plan before its tool calls,
 * which folds with its work when the turn ends, and its answer.
 */
export interface DevScript {
  plan: readonly string[]
  answer: readonly string[]
}

const plan = ['I will read ', 'the files that this touches first.']

/**
 * What each scripted turn writes, in the parts that the agent writes it.
 * The page sends each part as its own update, and the whole answer last.
 * With the headings answer, the plan starts with a heading, so its message
 * line in the folded work holds a heading. With the prose answer, the plan
 * holds a quote, a rule, strikethrough, and a line break. With the pictures
 * answer, the plan holds a screenshot, so its closed message line shows the
 * link, and the open line shows the picture.
 */
export const devScripts: Readonly<Record<DevOptions['answer'], DevScript>> = {
  text: {
    plan,
    answer: ['Done. The form now ', 'does what you asked, and its tests pass.'],
  },
  tables: { plan, answer: tables },
  headings: {
    plan: [
      '## Plan\n',
      '- Read the form and the hook.\n',
      '- Then run the checkout tests.',
    ],
    answer: headings,
  },
  prose: { plan: prosePlan, answer: proseAnswer },
  long: { plan, answer: longAnswer },
  tasks: { plan: taskPlan, answer: taskAnswer },
  pictures: {
    plan: [
      'The list of suggestions covers the postcode field: ',
      `![Postcode field before the fix](${devShots.before}). I will move it under the field.`,
    ],
    answer: pictures,
  },
}
