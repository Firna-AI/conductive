/**
 * The failures and the skips of the migration job of the host connection,
 * as the Providers tab of the operator shows them at each moment (own
 * computer decision 7 D). Each failed machine and each skipped one gets the
 * bootstrap at its next start.
 */
import type {
  JobFailure,
  JobProblems,
  SkipReason,
} from '../components/operator/migrationModel'
import type { JobMoment } from './migrationJob'

/** The steps that failed by 24 Nov at 11:40, newest first. */
const midwayFailures: readonly JobFailure[] = [
  {
    org: 'Northwind',
    number: 88,
    computer: 'sbx_q2v7k1xd',
    step: 'brief-start',
    at: '24 Nov at 10:52',
  },
  {
    org: 'Blue Harbor',
    number: 31,
    computer: 'sbx_m4k8z2pe',
    step: 'brief-start',
    at: '24 Nov at 02:17',
  },
  { org: 'Orbit Studio', step: 'refresh', at: '23 Nov at 21:30' },
  {
    org: 'Kestrel Labs',
    number: 140,
    computer: 'sbx_r8d2n6tw',
    step: 'restart',
    at: '23 Nov at 06:05',
  },
]

/** No skip of any reason, as just after the count. */
const noSkips: Readonly<Record<SkipReason, number>> = {
  suspended: 0,
  'deleted-org': 0,
  'restore-ends': 0,
  'no-sandbox': 0,
  'provider-error': 0,
  creating: 0,
  'not-configured': 0,
}

/** Lumen Works, whose only admin an operator suspended. */
const noAdmin = ['Lumen Works']

/**
 * The failures and the skips at each moment: none just after the count,
 * those of 24 Nov at 11:40 while the job runs, and the last ones when it
 * is done.
 */
export function jobProblems(moment: JobMoment): JobProblems {
  if (moment === 'counting' || moment === 'counted') {
    return { failures: [], skips: noSkips, noAdmin: [] }
  }
  if (moment !== 'done') {
    const skips = {
      ...noSkips,
      suspended: 23,
      'deleted-org': 16,
      'restore-ends': 9,
      'no-sandbox': 5,
      'provider-error': 4,
      creating: 2,
    }
    return { failures: midwayFailures, skips, noAdmin }
  }
  const lastFailures: readonly JobFailure[] = [
    {
      org: 'Kestrel Labs',
      number: 77,
      computer: 'sbx_k7s2l9ab',
      step: 'brief-start',
      at: '25 Nov at 23:41',
    },
    {
      org: 'Tidepool',
      number: 3,
      computer: 'sbx_t1d3p8wl',
      step: 'brief-start',
      at: '25 Nov at 14:08',
    },
    ...midwayFailures,
  ]
  const skips = {
    ...noSkips,
    suspended: 31,
    'deleted-org': 16,
    'restore-ends': 22,
    'no-sandbox': 7,
    'provider-error': 6,
    creating: 5,
  }
  return { failures: lastFailures, skips, noAdmin }
}
