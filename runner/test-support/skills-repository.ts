import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { onTestFinished } from 'vitest'

import { SkillsRepository } from '../src/skills-repository'
import { repositoryFixture } from './repository'

export async function skillsFixture() {
  const repository = await repositoryFixture()
  const base = join(repository.home, 'remotes')
  const warnings: string[] = []
  const skill = (path: string, name: string, description = name) =>
    repository.write(
      join(path, 'SKILL.md'),
      `---\nname: ${name}\ndescription: ${description}\n---\n${description}\n`,
    )
  const remote = (name = 'org/skills') => join(base, `${name}.git`)
  const publish = async (name = 'org/skills') => {
    await repository.git('add', '.')
    await repository.git('commit', '--allow-empty', '-m', 'skills')
    await mkdir(dirname(remote(name)), { recursive: true })
    await repository.git('clone', '--bare', '--', repository.root, remote(name))
  }
  const update = async () => {
    await repository.git('add', '.')
    await repository.git('commit', '-m', 'updated skills')
    await repository.git('push', '--', remote(), 'HEAD:refs/heads/task')
  }
  const create = (
    name = 'org/skills',
    intervalMs = 1000,
    githubBaseUrl = pathToFileURL(base).href,
  ) => {
    const copy = new SkillsRepository(
      {
        home: repository.home,
        skillsRepository: name,
        warn: (message) => warnings.push(message),
      },
      { githubBaseUrl, intervalMs },
    )
    onTestFinished(() => copy.close())
    return copy
  }
  return { ...repository, skill, publish, update, remote, create, warnings }
}
