import type { Agent } from '../../src/shared/agents'
import type { RunnerBranches } from '../../src/shared/runner'
import { object, string } from './parse'

export interface BuiltInstructions {
  text: Record<Agent, string>
  branches: RunnerBranches | null
}

export function parseBranches(value: unknown): RunnerBranches {
  const branches = object(value)
  return {
    workspaceBranch: string(branches.workspaceBranch),
    targetBranch: string(branches.targetBranch),
  }
}

/** Older saved instructions remain exact, including an unknown branch identity. */
export function legacyInstructionBranches(text: string): RunnerBranches | null {
  const workspace = /^Workspace branch: (.+)$/mu.exec(text)?.[1]
  const target = /^Target branch: (.+)$/mu.exec(text)?.[1]
  if (!workspace || !target) return null
  try {
    const workspaceBranch: unknown = JSON.parse(workspace)
    const targetBranch: unknown = JSON.parse(target)
    return typeof workspaceBranch === 'string' &&
      typeof targetBranch === 'string'
      ? { workspaceBranch, targetBranch }
      : null
  } catch {
    return null
  }
}
