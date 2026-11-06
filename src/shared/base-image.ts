export interface BaseImage {
  operatingSystem: string
  software: readonly string[]
}

/**
 * Included before the org install script runs.
 * Source: https://docs.boat.dev/machines/tools
 * Checked: 2026-11-06. Boat measured versions on 2026-10-13.
 * These labels describe the base image, not a running sandbox's live versions.
 */
export const BASE_IMAGE: BaseImage = {
  operatingSystem: 'Ubuntu 24.04',
  software: [
    'Node.js 24',
    'npm',
    'pnpm',
    'Bun',
    'Python 3.12',
    'uv',
    'Go',
    'Rust',
    'Java',
    'GCC',
    'Clang',
    'Docker',
    'git',
    'gh',
  ],
}
