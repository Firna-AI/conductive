import { expect, it } from 'vitest'

import { shellQuote } from './commands'
import { sourceLayoutCommand } from './image-sources/layout-command'
import {
  legacyRepositoryLocations,
  repositoryEnvironment,
  repositoryLocations,
} from './repository-locations'
import { repositoryShellFixture } from './repository-shell-test-support'

it('keeps safe repository names and resolves folder and shell variable collisions without shell injection', async () => {
  const local = await repositoryShellFixture()
  try {
    const repositories = [
      ['a', 'acme/storefront'],
      ['b', 'other/storefront'],
      ['c', 'acme/acme-storefront'],
      ['d', 'acme/Foo_Bar'],
      ['e', 'acme/foo-bar'],
      ['f', 'acme/UPPER'],
      ['g', 'acme/upper'],
      ['h', "bad/../../bad name'; touch PWNED"],
    ].map(([id, fullName]) => ({
      id,
      fullName,
      orgId: 'org',
      defaultBranch: 'main',
    }))
    const locations = repositoryLocations(repositories)
    expect(
      locations.map((location) => [location.directory, location.variable]),
    ).toEqual([
      [
        '/home/user/code/acme-storefront',
        'CONDUCTING_REPOSITORY_ACME_STOREFRONT_DIR',
      ],
      [
        '/home/user/code/other-storefront',
        'CONDUCTING_REPOSITORY_OTHER_STOREFRONT_DIR',
      ],
      [
        '/home/user/code/acme-storefront-2',
        'CONDUCTING_REPOSITORY_ACME_STOREFRONT_2_DIR',
      ],
      ['/home/user/code/Foo_Bar', 'CONDUCTING_REPOSITORY_FOO_BAR_DIR'],
      ['/home/user/code/foo-bar', 'CONDUCTING_REPOSITORY_FOO_BAR_2_DIR'],
      ['/home/user/code/acme-UPPER', 'CONDUCTING_REPOSITORY_ACME_UPPER_DIR'],
      [
        '/home/user/code/acme-upper-2',
        'CONDUCTING_REPOSITORY_ACME_UPPER_2_DIR',
      ],
      [
        '/home/user/code/bad-name---touch-PWNED',
        'CONDUCTING_REPOSITORY_BAD_NAME___TOUCH_PWNED_DIR',
      ],
    ])
    expect(repositoryLocations([...repositories].reverse())).toEqual(locations)
    const command = [
      ...locations.map(
        (location) => `mkdir -p ${shellQuote(location.directory)}`,
      ),
      ...locations.map(
        (location) => `cd "$${location.variable}"\nprintf '%s\\n' "$PWD"`,
      ),
      `test ! -e ${shellQuote(`${local.home}/PWNED`)}`,
    ].join('\n')
    expect(await local.run(command, repositoryEnvironment(locations))).toEqual({
      exitCode: 0,
      timedOut: false,
      stderr: '',
      stdout: locations
        .map((location) => `${local.mapped(location.directory)}\n`)
        .join(''),
    })
    const legacy = legacyRepositoryLocations(repositories.slice(0, 1))
    expect(
      await local.run(
        `mkdir -p ${shellQuote(legacy[0].directory)}\nprintf dependency > ${shellQuote(`${legacy[0].directory}/dependency`)}`,
      ),
    ).toMatchObject({ exitCode: 0 })
    // A legacy snapshot moves complete folders, including untracked installed files.
    const migration = sourceLayoutCommand('legacy-build', locations, legacy)
    // The target was created above only for the shell check. Keep its complete contents out of the move.
    expect(
      await local.run(`rmdir ${shellQuote(locations[0].directory)}`),
    ).toMatchObject({ exitCode: 0 })
    expect(await local.run(migration)).toMatchObject({ exitCode: 0 })
    expect(await local.read(`${locations[0].directory}/dependency`)).toBe(
      'dependency',
    )
    expect(await local.run(migration)).toMatchObject({ exitCode: 0 })
    expect(await local.read(`${locations[0].directory}/dependency`)).toBe(
      'dependency',
    )
    expect(
      await local.run(
        `printf second > ${shellQuote(`${locations[1].directory}/dependency`)}`,
      ),
    ).toMatchObject({ exitCode: 0 })
    const swapped = [
      { ...locations[0], directory: locations[1].directory },
      { ...locations[1], directory: locations[0].directory },
    ]
    const rename = sourceLayoutCommand(
      'colliding-build',
      swapped,
      locations.slice(0, 2),
    )
    expect(await local.run(rename)).toMatchObject({ exitCode: 0 })
    expect(await local.read(`${swapped[0].directory}/dependency`)).toBe(
      'dependency',
    )
    expect(await local.read(`${swapped[1].directory}/dependency`)).toBe(
      'second',
    )
    expect(await local.run(rename)).toMatchObject({ exitCode: 0 })
    expect(await local.read(`${swapped[0].directory}/dependency`)).toBe(
      'dependency',
    )
    expect(await local.read(`${swapped[1].directory}/dependency`)).toBe(
      'second',
    )
  } finally {
    await local.dispose()
  }
})
