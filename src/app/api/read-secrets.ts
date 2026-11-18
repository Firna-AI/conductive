import type {
  OrgSecret,
  SecretReveal,
  SessionSecretApproval,
  WorkspaceCapabilitiesResponse,
} from '../../shared/secrets'
import {
  count,
  flag,
  items,
  maybeNested,
  nested,
  record,
  text,
  texts,
} from './parse'
import { readSender } from './read-core'

/** The capabilities of a workspace, with the approvals of its sessions. */
export type WorkspaceGrants = WorkspaceCapabilitiesResponse['capabilities']

function readReveal(value: unknown): SecretReveal {
  const reveal = record(value, 'reveal')
  return {
    revealedByUserId: text(reveal, 'revealedByUserId'),
    revealedBy: maybeNested(reveal, 'revealedBy', readSender),
    revealedAt: count(reveal, 'revealedAt'),
  }
}

/**
 * A secret of an org, as the list and each change give it. The reader keeps
 * no other field, so a value never reaches a screen through the list, also
 * from a reply that holds one.
 */
function readOrgSecret(value: unknown): OrgSecret {
  const secret = record(value, 'secret')
  return {
    id: text(secret, 'id'),
    name: text(secret, 'name'),
    description: text(secret, 'description'),
    createdByUserId: text(secret, 'createdByUserId'),
    createdBy: maybeNested(secret, 'createdBy', readSender),
    allAgents: flag(secret, 'allAgents'),
    createdAt: count(secret, 'createdAt'),
    updatedAt: count(secret, 'updatedAt'),
    lastReveal: maybeNested(secret, 'lastReveal', readReveal),
  }
}

/** The secrets of an org, in the order of the reply. */
export function readSecrets(value: unknown): OrgSecret[] {
  return items(record(value, 'secrets'), 'secrets', readOrgSecret)
}

/** The secret of the reply of a create, a Replace, or the mark. */
export function readSecretResponse(value: unknown): OrgSecret {
  return nested(record(value, 'secret response'), 'secret', readOrgSecret)
}

/** The one value of the reply of a reveal. */
export function readRevealedValue(value: unknown): string {
  return text(record(value, 'reveal response'), 'value')
}

function readApproval(value: unknown): SessionSecretApproval {
  const approval = record(value, 'approval')
  return {
    secretId: text(approval, 'secretId'),
    sessionId: text(approval, 'sessionId'),
    approvedByUserId: text(approval, 'approvedByUserId'),
    approvedBy: maybeNested(approval, 'approvedBy', readSender),
    approvedAt: count(approval, 'approvedAt'),
  }
}

/** The capabilities of a workspace, as a read and each change give them. */
export function readWorkspaceGrants(value: unknown): WorkspaceGrants {
  const grants = record(
    record(value, 'capabilities response').capabilities,
    'capabilities',
  )
  return {
    preapprovedSecretIds: texts(grants, 'preapprovedSecretIds'),
    macAccess: flag(grants, 'macAccess'),
    sessionApprovals: items(grants, 'sessionApprovals', readApproval),
  }
}
