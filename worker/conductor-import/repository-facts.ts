import type { ImportRepositoryFacts } from '../../src/shared/conductor-import-operation.ts'
import {
  importInteger,
  importNullableText,
  importObject,
  importOid,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import type { AppDependencies, AppEnv } from '../env'
import { graphql } from '../github/transport'
import { githubFailure } from '../github/parsers'
import { freshGitHubUserToken } from '../security/github-tokens'
import {
  requireImportAccess,
  importUnavailable,
  type ImportActor,
} from './access'
import type { ReservationRow } from './reservation-data'
import {
  repositoryProof,
  storeRepositoryProof,
  storeVerifiedPrerequisite,
} from './repository-data'

const FACTS = `query ImportRepository($owner:String!,$name:String!,$branch:String!) {
  repository(owner:$owner,name:$name) { databaseId nameWithOwner
    ref(qualifiedName:$branch) { target { oid } }
    defaultBranchRef { name target { oid } }
  }
}`
const PROOF = `query ImportPrerequisite($owner:String!,$name:String!,$ref:String!,$candidate:String!) {
  repository(owner:$owner,name:$name) { databaseId
    ref(qualifiedName:$ref) { target { oid }
      compare(headRef:$candidate) { aheadBy baseTarget { oid } headTarget { oid } }
    }
  }
}`

async function context(
  env: AppEnv,
  actor: ImportActor,
  row: ReservationRow,
  dependencies: AppDependencies,
) {
  await requireImportAccess(env.DB, actor, dependencies.now())
  const repository = await env.DB.prepare(
    `SELECT r.github_repository_id AS id,r.full_name AS fullName
    FROM repositories r LEFT JOIN github_installations i ON i.id = r.installation_id
    WHERE r.id = ? AND r.org_id = ? AND r.selected = 1
      AND (r.installation_id IS NULL OR (i.id IS NOT NULL AND i.suspended_at IS NULL))`,
  )
    .bind(row.repositoryId, row.orgId)
    .first<{ id: number; fullName: string }>()
  if (!repository) throw importUnavailable()
  const [owner, name] = repository.fullName.split('/')
  const token = await freshGitHubUserToken(
    env,
    row.importerUserId,
    dependencies,
  )
  return { repository, owner, name, token }
}

function oid(value: unknown): string | null {
  return value === null
    ? null
    : importOid(importObject(importObject(value).target).oid)
}

export async function currentRepositoryFacts(
  env: AppEnv,
  actor: ImportActor,
  row: ReservationRow,
  dependencies: AppDependencies,
): Promise<ImportRepositoryFacts> {
  const read = await context(env, actor, row, dependencies)
  const value = importObject(
    (
      await graphql(dependencies.fetch, read.token, FACTS, {
        owner: read.owner,
        name: read.name,
        branch: `refs/heads/${row.branch}`,
      })
    ).repository,
  )
  if (importInteger(value.databaseId) !== read.repository.id)
    throw githubFailure()
  const defaultRef =
    value.defaultBranchRef === null
      ? null
      : importObject(value.defaultBranchRef)
  const facts: ImportRepositoryFacts = {
    id: crypto.randomUUID(),
    repositoryId: read.repository.id,
    fullName: importText(value.nameWithOwner),
    branch: row.branch,
    branchHeadOid: oid(value.ref),
    defaultBranch: defaultRef ? importText(defaultRef.name) : '',
    defaultHeadOid: oid(value.defaultBranchRef),
    observedAt: dependencies.now(),
  }
  await context(env, actor, row, dependencies)
  await storeRepositoryProof(
    env.DB,
    actor,
    row.id,
    facts.id,
    'facts',
    facts,
    dependencies.now(),
  )
  return facts
}

export async function verifyPrerequisites(
  env: AppEnv,
  actor: ImportActor,
  row: ReservationRow,
  dependencies: AppDependencies,
  input: {
    factsId: string
    sourceFingerprint: string
    headOid: string
    candidates: string[]
  },
) {
  const saved = await repositoryProof(env.DB, row.id, input.factsId)
  const facts = {
    repositoryId: importInteger(saved.repositoryId),
    branch: importText(saved.branch),
    branchHeadOid: importNullableText(saved.branchHeadOid),
    defaultBranch:
      typeof saved.defaultBranch === 'string' ? saved.defaultBranch : '',
    defaultHeadOid: importNullableText(saved.defaultHeadOid),
  }
  const read = await context(env, actor, row, dependencies)
  if (facts.repositoryId !== read.repository.id || facts.branch !== row.branch)
    throw importUnavailable()
  const heads = [
    { branch: facts.branch, oid: facts.branchHeadOid },
    { branch: facts.defaultBranch, oid: facts.defaultHeadOid },
  ].filter((head) => head.oid !== null)
  const verified: { oid: string; headOid: string }[] = []
  const missing: string[] = []
  const receiptId = crypto.randomUUID()
  for (const candidate of new Set(input.candidates)) {
    let found: string | null = null
    for (const head of heads) {
      const value = importObject(
        (
          await graphql(dependencies.fetch, read.token, PROOF, {
            owner: read.owner,
            name: read.name,
            ref: `refs/heads/${head.branch}`,
            candidate,
          })
        ).repository,
      )
      if (importInteger(value.databaseId) !== facts.repositoryId)
        throw githubFailure()
      if (value.ref === null || oid(value.ref) !== head.oid)
        throw githubFailure()
      const comparison = importObject(value.ref).compare
      if (comparison !== null) {
        const revisions = importObject(comparison)
        if (
          importObject(revisions.baseTarget).oid !== head.oid ||
          importObject(revisions.headTarget).oid !== candidate
        )
          throw githubFailure()
        if (importInteger(revisions.aheadBy) === 0) {
          found = importOid(head.oid)
          break
        }
      }
    }
    if (found) {
      await storeVerifiedPrerequisite(
        env.DB,
        actor,
        row.id,
        receiptId,
        candidate,
        found,
        dependencies.now(),
      )
      verified.push({ oid: candidate, headOid: found })
    } else missing.push(candidate)
  }
  await context(env, actor, row, dependencies)
  await storeRepositoryProof(
    env.DB,
    actor,
    row.id,
    receiptId,
    'prerequisites',
    {
      factsId: input.factsId,
      sourceFingerprint: input.sourceFingerprint,
      headOid: input.headOid,
      repositoryId: facts.repositoryId,
    },
    dependencies.now(),
  )
  return { receiptId, verified, missing }
}
