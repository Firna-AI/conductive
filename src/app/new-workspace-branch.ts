import type { Repository } from '../shared/org-settings'
import type { CreateWorkspaceRequest } from '../shared/workspaces'

/**
 * The target of a picked branch: that branch, so the work stacks on it, or
 * the default branch of the repository (decision 291).
 */
export type BranchTarget = 'picked' | 'default'

/**
 * The branch of a draft in one repository: the branch that the member
 * picked, and the target that the member chose. A change of repository
 * clears it, because a branch belongs to one repository.
 */
export interface DraftBranch {
  repositoryId: string
  /** The picked branch, or `null` for the default branch. */
  name: string | null
  /**
   * The target that the member chose, or `null` before a choice. A pick of
   * another branch keeps it.
   */
  target: BranchTarget | null
}

/** What a New workspace form shows of the branch of its repository. */
export interface FormBranch {
  /** The branch that the control names, which the new branch starts from. */
  name: string
  defaultBranch: string
  /**
   * The target of a picked branch that is not the default branch, or `null`
   * while the control names the default branch. The picked branch is
   * selected until the member chooses (decision 295).
   */
  target: BranchTarget | null
}

/** The repository that a branch of a form belongs to. */
export type BranchRepository = Pick<Repository, 'id' | 'defaultBranch'>

/** The branch fields of a create request. */
export type BranchFields = Pick<
  CreateWorkspaceRequest,
  'startBranch' | 'baseBranch'
>

/**
 * The branch of a draft once its repository is `repositoryId`: the branch
 * stays only in its own repository.
 */
export function branchIn(
  branch: DraftBranch | null,
  repositoryId: string | undefined,
): DraftBranch | null {
  return branch?.repositoryId === repositoryId ? branch : null
}

/**
 * The branch that a form shows in `repository`: the picked branch, else the
 * default branch. A pick of the default branch shows no target.
 */
export function formBranch(
  branch: DraftBranch | null,
  repository: BranchRepository,
): FormBranch {
  const own = branchIn(branch, repository.id)
  const name = own?.name ?? repository.defaultBranch
  const picked = name !== repository.defaultBranch
  return {
    name,
    defaultBranch: repository.defaultBranch,
    target: picked ? (own?.target ?? 'picked') : null,
  }
}

/**
 * The branch fields of a create from a form. The default branch sends none,
 * as every create did before. A picked branch names itself as the start,
 * and its target as the base, also when the target is the default branch.
 */
export function branchFields(form: FormBranch): BranchFields {
  if (form.target === null) return {}
  return {
    startBranch: form.name,
    baseBranch: form.target === 'picked' ? form.name : form.defaultBranch,
  }
}

/**
 * The branch of a draft after a pick of `name` in `repository`. A pick of
 * the default branch keeps no name, so the control follows a rename of the
 * default branch. The target that the member chose stays.
 */
export function withPick(
  branch: DraftBranch | null,
  repository: BranchRepository,
  name: string,
): DraftBranch {
  return {
    repositoryId: repository.id,
    name: name === repository.defaultBranch ? null : name,
    target: branchIn(branch, repository.id)?.target ?? null,
  }
}

/** The branch of a draft after the member chose the target `target`. */
export function withTarget(
  branch: DraftBranch | null,
  repository: BranchRepository,
  target: BranchTarget,
): DraftBranch {
  return {
    repositoryId: repository.id,
    name: branchIn(branch, repository.id)?.name ?? null,
    target,
  }
}
