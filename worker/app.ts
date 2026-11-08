import { createApp } from './application'
import type { AppEnv } from './env'

export const app = createApp() satisfies ExportedHandler<AppEnv>
