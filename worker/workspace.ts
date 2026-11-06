import { DurableObject } from 'cloudflare:workers'

export class Workspace extends DurableObject<Env> {}
