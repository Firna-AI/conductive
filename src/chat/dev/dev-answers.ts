import type { DevOptions } from './dev-options'

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
 * The answer of each scripted turn, in the parts that the agent writes it.
 * The page sends each part as its own update, and the whole answer last.
 */
export const devAnswers: Readonly<
  Record<DevOptions['answer'], readonly string[]>
> = {
  text: ['Done. The form now ', 'does what you asked, and its tests pass.'],
  tables,
}
