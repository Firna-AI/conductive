import type {
  BuildState,
  OrgBuilds,
} from '../../../components/settings/BuildSection'
import type { OrgComputer } from '../../../components/settings/ComputerTab'
import type { ReadOnlyCause } from '../../../../../../src/ui/components/settings/readOnlyCause'
import {
  buildHistory,
  changedInstallScript,
  envVars,
  firnaInstallScript,
  installScript,
  lastBuild,
  startupScript,
  type Build,
} from '../../../fixtures/computer'
import {
  buildLog,
  endedBuildLog,
  endedFirstBuildLog,
  failedBuildLog,
  failedFirstBuildLog,
  firstBuildLog,
  timedOutBuildLog,
  timedOutFirstBuildLog,
  waitingBuildLog,
} from '../../../fixtures/terminal'
import { terminalLineSchema } from '../tools/terminalSchemas'
import { skillsLookupSchema } from './skillsSchemas'

/** The states of the cloud computer, as `BuildState` lists them. */
const buildStates = [
  'ready',
  'building',
  'waiting',
  'failed',
  'time-limit',
  'ended',
  'none',
] as const satisfies readonly BuildState[]

/** The state of the builds of the cloud computer of an org. */
export const buildStateSchema = { enum: buildStates } as const

/** Why the settings show without edit fields, as `ReadOnlyCause`. */
export const readOnlyCauseSchema = {
  enum: ['member', 'suspended'] as const satisfies readonly ReadOnlyCause[],
} as const

/** The results of a build, as `Build` lists them. */
const buildResults = [
  'succeeded',
  'failed',
] as const satisfies readonly Build['result'][]

/** A build that ended, as `Build`: its time, its result, and its length. */
export const buildSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['when', 'result', 'duration'],
  properties: {
    when: { type: 'string' },
    result: { enum: buildResults },
    duration: { type: 'string' },
  },
} as const

/** The lines of the log of a build. */
const logSchema = { type: 'array', items: terminalLineSchema } as const

/** The builds of an org, as the fields of `OrgBuilds`. */
const orgBuildsProperties = {
  /** The newest good build, which every workspace starts from. */
  lastGood: buildSchema,
  /** The builds that ended, newest first. */
  history: { type: 'array', items: buildSchema },
  /** The log of the build that runs or failed, in each state with a log. */
  logs: {
    type: 'object',
    additionalProperties: false,
    required: ['building', 'waiting', 'failed', 'time-limit', 'ended'],
    properties: {
      building: logSchema,
      waiting: logSchema,
      failed: logSchema,
      'time-limit': logSchema,
      ended: logSchema,
    },
  },
} as const

/** The builds of an org as JSON, as `OrgBuilds`. */
export const orgBuildsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['history', 'logs'],
  properties: orgBuildsProperties,
} as const

/** An env var of an org, as `EnvVar`: its name and its Secret mark. */
export const envVarSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'secret'],
  properties: { name: { type: 'string' }, secret: { type: 'boolean' } },
} as const

/** The cloud computer of an org as JSON, as `OrgComputer`. */
export const orgComputerSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'history',
    'logs',
    'installScript',
    'changedInstallScript',
    'startupScript',
    'envVars',
  ],
  properties: {
    ...orgBuildsProperties,
    installScript: { type: 'string' },
    /** The install script after an admin changed it. */
    changedInstallScript: { type: 'string' },
    startupScript: { type: 'string' },
    envVars: { type: 'array', items: envVarSchema },
    /** The GitHub repository of skills, as owner/name, when the org has one. */
    skillsRepository: { type: 'string' },
    skillsLookup: skillsLookupSchema,
  },
} as const

/** The builds of Acme, which has built its cloud computer many times. */
export const acmeBuilds = {
  lastGood: lastBuild,
  history: buildHistory,
  logs: {
    building: buildLog,
    waiting: waitingBuildLog,
    failed: failedBuildLog,
    'time-limit': timedOutBuildLog,
    ended: endedBuildLog,
  },
} satisfies OrgBuilds

/** The builds of a new org, which has no good build yet. */
export const newOrgBuilds = {
  history: [],
  logs: {
    building: firstBuildLog,
    waiting: waitingBuildLog,
    failed: failedFirstBuildLog,
    'time-limit': timedOutFirstBuildLog,
    ended: endedFirstBuildLog,
  },
} satisfies OrgBuilds

/** The cloud computer of Acme, with its scripts and its env vars. */
export const acmeComputer = {
  ...acmeBuilds,
  installScript,
  changedInstallScript,
  startupScript,
  envVars,
} satisfies OrgComputer

/**
 * The cloud computer of a new org: empty scripts and no env vars, and the
 * install script that an admin saves after its first build.
 */
export const newComputer = {
  ...newOrgBuilds,
  installScript: '',
  changedInstallScript: firnaInstallScript,
  startupScript: '',
  envVars: [],
} satisfies OrgComputer
