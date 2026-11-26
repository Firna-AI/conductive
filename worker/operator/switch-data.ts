import type { OperatorProviderSwitch } from '../../src/shared/operator-switch'
import { switchActor, switchJob } from './switch-context-data'

interface SwitchRow extends Omit<
  OperatorProviderSwitch,
  'operator' | 'stoppedBy' | 'waitingJob' | 'endRunningJob'
> {
  endRunningJob: number
  operatorGithubId: number | null
  operatorLogin: string | null
  stoppedByGithubId: number | null
  stoppedByLogin: string | null
  waitJobId: string | null
  waitJobKind: 'build' | 'refresh' | null
  waitJobStartedAt: number | null
  waitJobStarterGithubId: number | null
  waitJobStarterLogin: string | null
}

const switchColumns = `s.id, s.org_id AS orgId, s.from_account AS fromAccount,
  s.to_account AS toAccount, s.requested_at AS requestedAt,
  actor.github_id AS operatorGithubId, actor.github_login AS operatorLogin,
  s.end_running_job AS endRunningJob, s.end_running_job_id AS endRunningJobId,
  s.state, s.wait_reason AS waitReason, s.build_id AS buildId,
  s.build_started_at AS buildStartedAt, s.build_completed_at AS buildCompletedAt,
  s.failure_cause AS failure, s.account_changed_at AS accountChangedAt,
  s.stopped_at AS stoppedAt, stopper.github_id AS stoppedByGithubId,
  stopper.github_login AS stoppedByLogin, job.id AS waitJobId,
  job.kind AS waitJobKind, job.started_at AS waitJobStartedAt,
  starter.github_id AS waitJobStarterGithubId, starter.github_login AS waitJobStarterLogin`
const switchTables = `FROM org_provider_switches s
  LEFT JOIN users actor ON actor.id = s.operator_user_id
  LEFT JOIN users stopper ON stopper.id = s.stopped_by_user_id
  LEFT JOIN image_builds job ON job.id = s.wait_job_id AND job.org_id = s.org_id
  LEFT JOIN users starter ON starter.id = job.started_by_user_id`

function providerSwitch(row: SwitchRow): OperatorProviderSwitch {
  return {
    id: row.id,
    orgId: row.orgId,
    fromAccount: row.fromAccount,
    toAccount: row.toAccount,
    requestedAt: row.requestedAt,
    operator: switchActor(row.operatorGithubId, row.operatorLogin),
    endRunningJob: row.endRunningJob === 1,
    endRunningJobId: row.endRunningJobId,
    state: row.state,
    waitReason: row.waitReason,
    waitingJob:
      row.waitJobId === null ||
      row.waitJobKind === null ||
      row.waitJobStartedAt === null
        ? null
        : switchJob({
            id: row.waitJobId,
            kind: row.waitJobKind,
            startedAt: row.waitJobStartedAt,
            starterGithubId: row.waitJobStarterGithubId,
            starterLogin: row.waitJobStarterLogin,
          }),
    buildId: row.buildId,
    buildStartedAt: row.buildStartedAt,
    buildCompletedAt: row.buildCompletedAt,
    failure: row.failure,
    accountChangedAt: row.accountChangedAt,
    stoppedAt: row.stoppedAt,
    stoppedBy: switchActor(row.stoppedByGithubId, row.stoppedByLogin),
  }
}

function switchRecordStatement(db: D1Database, orgId: string, id: string) {
  return db
    .prepare(
      `SELECT ${switchColumns} ${switchTables}
    WHERE s.org_id = ? AND s.id = ?`,
    )
    .bind(orgId, id)
}

export async function readSwitchRecord(
  db: D1Database,
  orgId: string,
  id: string,
) {
  const row = await switchRecordStatement(db, orgId, id).first<SwitchRow>()
  return row ? providerSwitch(row) : null
}

export async function readOrgSwitches(db: D1Database, orgId: string) {
  const [latest, completed] = await db.batch<SwitchRow>([
    db
      .prepare(
        `SELECT ${switchColumns} ${switchTables}
      WHERE s.org_id = ? ORDER BY s.rowid DESC LIMIT 1`,
      )
      .bind(orgId),
    db
      .prepare(
        `SELECT ${switchColumns} ${switchTables}
      WHERE s.org_id = ? AND s.state = 'completed'
      ORDER BY s.account_changed_at DESC, s.rowid DESC LIMIT 1`,
      )
      .bind(orgId),
  ])
  const newest = latest.results[0]
  const last = completed.results[0]
  return {
    providerSwitch:
      newest && ['waiting', 'building', 'failed'].includes(newest.state)
        ? providerSwitch(newest)
        : null,
    lastProviderSwitch: last ? providerSwitch(last) : null,
  }
}
