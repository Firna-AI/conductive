import type { Agent } from '../shared/generated/Agent'

/** Orders login requests through their reply application for each named agent. */
export class AccountLoginRequests {
  /** Settled tails cannot carry a failed request into the next request. */
  private readonly pending = new Map<Agent, Promise<unknown>>()

  /** A complete account read names both agents. A write names only its agent. */
  run<T>(agents: readonly Agent[], request: () => Promise<T>): Promise<T> {
    const before = agents.map((agent) => this.pending.get(agent))
    const run = Promise.all(before).then(request)
    const settled = run.catch(() => undefined)
    for (const agent of agents) this.pending.set(agent, settled)
    return run
  }
}
