import type { SessionLogin } from '../shared/generated/SessionLogin'
import {
  automationPath,
  type Automation,
  type AutomationResponse,
} from '../shared/automations'
import type { OrgSecret } from '../shared/secrets'
import { ApiError, type ApiClient } from './api/client'
import { readAutomationResponse } from './api/read-automations'
import type { OrgModel } from './org-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import { AutomationRuns } from './automation-runs'
import { partOf, type Loadable, type Readable } from './store'

/** The code of the API for an automation that the org does not have. */
const automationNotFound = 'automation_not_found'

/** Whether an error says that the org does not have the automation. */
function isAutomationMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === automationNotFound
}

/**
 * The client of the requests of an automation page beside the read of the
 * automation. A refusal with `automation_not_found` calls `recheck`, then goes to
 * the caller. A write can get that refusal also while the automation exists,
 * so only a read of the automation decides.
 */
function noteMissingAutomation(api: ApiClient, recheck: () => void): ApiClient {
  const watch = async <T>(request: Promise<T>): Promise<T> => {
    try {
      return await request
    } catch (error) {
      if (isAutomationMissing(error)) recheck()
      throw error
    }
  }
  return {
    fetch: api.fetch,
    get: (path, read) => watch(api.get(path, read)),
    send: (method, path, body, read) =>
      watch(api.send(method, path, body, read)),
    sendPart: (path, part, read, hooks) =>
      watch(api.sendPart(path, part, read, hooks)),
  }
}

/**
 * One automation of an org, as its page shows it, with its runs. It reads when
 * its page mounts and at each return of the user to the page. Its saves go
 * out one at a time, and each answer shows the whole automation. A read that
 * the API refuses with `automation_not_found` shows that the automation is not
 * available, also in place of the automation. Any other failed read keeps the
 * automation that shows. Each answer also names the login of the runs and
 * the chosen secrets.
 */
export class AutomationModel {
  readonly automationId: string
  readonly resource: Resource<AutomationResponse>
  readonly automation: Readable<Loadable<Automation>>
  /**
   * The login of the runs, as the last answer names it: the default login
   * of the owner for the agent of the automation, or null when no login
   * serves the owner.
   */
  readonly runLogin: Readable<Loadable<SessionLogin | null>>
  /**
   * The ID and the name of each chosen secret that the org has, as the last
   * answer names them, or null when the answer of a previous Worker names
   * none. They come from the same answer as the automation.
   */
  readonly chosenSecrets: Readable<
    Loadable<readonly Pick<OrgSecret, 'id' | 'name'>[] | null>
  >
  /**
   * The client of each request of the page beside the read of the automation:
   * the reads of the runs, Show older runs, Save, Turn off, Run now, and
   * Delete. An `automation_not_found` from any of them reads the automation again.
   */
  readonly client: ApiClient
  readonly runs: AutomationRuns
  private readonly reads: Refresher<AutomationResponse>

  constructor(org: OrgModel, automationId: string) {
    this.automationId = automationId
    this.resource = new Resource(
      () =>
        org.services.api.get(
          automationPath(org.orgId, automationId),
          readAutomationResponse,
        ),
      { missing: isAutomationMissing },
    )
    this.automation = partOf(this.resource.store, (reply) => reply.automation)
    this.runLogin = partOf(this.resource.store, (reply) => reply.runLogin)
    this.chosenSecrets = partOf(
      this.resource.store,
      (reply) => reply.chosenSecrets ?? null,
    )
    this.reads = new Refresher(this.resource, () => null, org.services)
    this.client = noteMissingAutomation(
      org.services.api,
      () => void this.reads.reread(),
    )
    this.runs = new AutomationRuns(org, automationId, this.client)
  }

  /** The page shows the automation. The result says that it no longer does. */
  watch(): () => void {
    return this.reads.watch()
  }

  /** Reads the automation now, such as for Try again. */
  reload(): Promise<void> {
    return this.reads.refresh()
  }
}

/** The automation models of each org model, by automation. */
const models = new WeakMap<OrgModel, Map<string, AutomationModel>>()

/**
 * The model of an automation of an org. It stays while the app keeps the org
 * model, so a return to the automation shows it at once.
 */
export function automationModel(
  org: OrgModel,
  automationId: string,
): AutomationModel {
  let automations = models.get(org)
  if (!automations) {
    automations = new Map()
    models.set(org, automations)
  }
  let model = automations.get(automationId)
  if (!model) {
    model = new AutomationModel(org, automationId)
    automations.set(automationId, model)
  }
  return model
}

/**
 * Forgets the model of a deleted automation. A later visit of its address
 * reads it again, and shows that it is not available.
 */
export function forgetAutomation(org: OrgModel, automationId: string): void {
  models.get(org)?.delete(automationId)
}
