import {
  routinesPath,
  type RoutineRun,
  type RoutinesResponse,
} from '../../shared/routines'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, type Route } from './router'
import type { OrgState } from './state'

/** The newest run of a routine, or null, as the list of the Worker gives it. */
function lastRun(org: OrgState, routineId: string): RoutineRun | null {
  let newest: RoutineRun | null = null
  for (const run of org.runs) {
    if (run.routineId !== routineId) continue
    if (!newest || run.createdAt > newest.createdAt) newest = run
  }
  return newest
}

/** The routines of an org, each with its newest run. */
export function routineRoutes(backend: DevBackend): Route[] {
  return [
    {
      method: 'GET',
      path: routinesPath(ID.org),
      answer: ({ params }) => {
        const org = requireOrg(backend.state, params.org)
        return json({
          routines: org.routines.map((routine) => ({
            ...routine,
            lastRun: lastRun(org, routine.id),
          })),
        } satisfies RoutinesResponse)
      },
    },
  ]
}
