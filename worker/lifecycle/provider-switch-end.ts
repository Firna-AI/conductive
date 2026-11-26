import type {
  OperatorSwitchFailure,
  OperatorSwitchWaitReason,
} from '../../src/shared/operator-switch'
import { activeOrgIdPredicate } from '../data/org-access'
import { ProviderError } from '../sandbox/errors'
import { JobTimeLimit } from './job-time-limit'
import { ProviderRetryExhausted } from './provider-retry'

export interface SwitchBuildFailure {
  cause?: OperatorSwitchFailure
  wait?: OperatorSwitchWaitReason
}

export const switchFailureMessages = {
  'time-limit': new JobTimeLimit('build').message,
  provider: new ProviderRetryExhausted().message,
} as const

export function switchBuildFailureCause(error: unknown): OperatorSwitchFailure {
  if (
    error instanceof JobTimeLimit ||
    error === switchFailureMessages['time-limit']
  )
    return 'time-limit'
  if (
    error instanceof ProviderRetryExhausted ||
    error instanceof ProviderError ||
    error === switchFailureMessages.provider
  )
    return 'provider'
  return 'script'
}

export const switchMayPublish = `(image_builds.operator_switch_id IS NULL OR EXISTS (
  SELECT 1 FROM org_provider_switches s JOIN orgs o ON o.id = s.org_id
  WHERE s.id = image_builds.operator_switch_id AND s.state = 'building'
    AND s.build_id = image_builds.id AND o.provider_account = s.from_account
    AND o.deleted_at IS NULL))`
export const buildStarterActive = `(image_builds.started_by_user_id IS NULL OR EXISTS (
  SELECT 1 FROM users u WHERE u.id = image_builds.started_by_user_id AND u.suspended_at IS NULL))`

export function switchFailureStatements(
  db: D1Database,
  buildId: string,
  now: number,
  failure: SwitchBuildFailure = {},
) {
  return [
    db
      .prepare(
        `UPDATE org_provider_switches SET state = ?, wait_reason = ?, wait_job_id = NULL,
    build_completed_at = ?, failure_cause = ? WHERE build_id = ? AND state = 'building'
    AND EXISTS (SELECT 1 FROM image_builds b WHERE b.id = org_provider_switches.build_id
      AND b.operator_switch_id = org_provider_switches.id AND b.state = 'running')`,
      )
      .bind(
        failure.wait ? 'waiting' : 'failed',
        failure.wait ?? null,
        now,
        failure.wait ? null : (failure.cause ?? 'script'),
        buildId,
      ),
  ]
}

export function switchPublicationStatements(
  db: D1Database,
  buildId: string,
  now: number,
  publishing: string,
) {
  return [
    db
      .prepare(
        `UPDATE orgs SET provider_account = (SELECT to_account FROM org_provider_switches
      WHERE build_id = ? AND state = 'building') WHERE id = (SELECT org_id FROM image_builds WHERE id = ?)
      AND EXISTS (SELECT 1 FROM image_builds WHERE id = ? AND operator_switch_id IS NOT NULL)
      AND ${publishing}`,
      )
      .bind(buildId, buildId, buildId, buildId),
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'completed', account_changed_at = ?,
      build_completed_at = ?, wait_reason = NULL, wait_job_id = NULL, failure_cause = NULL
      WHERE build_id = ? AND state = 'building'
      AND EXISTS (SELECT 1 FROM image_builds b JOIN orgs o ON o.id = b.org_id
        WHERE b.id = org_provider_switches.build_id AND b.state = 'running'
          AND b.operator_switch_id = org_provider_switches.id
          AND o.provider_account = org_provider_switches.to_account
          AND ${activeOrgIdPredicate('o.id')})`,
      )
      .bind(now, now, buildId),
    db
      .prepare(
        `UPDATE org_images SET next_image_refresh_at = NULL, pending_push_refresh_at = NULL
      WHERE EXISTS (SELECT 1 FROM org_provider_switches s WHERE s.build_id = ? AND s.state = 'completed'
        AND s.org_id = org_images.org_id AND s.from_account = org_images.provider_account)`,
      )
      .bind(buildId),
  ]
}

export const switchDidPublish = `(image_builds.operator_switch_id IS NULL OR EXISTS (
  SELECT 1 FROM org_provider_switches s WHERE s.id = image_builds.operator_switch_id
    AND s.build_id = image_builds.id AND s.state = 'completed'))`
