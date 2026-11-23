import { FakeGitHub } from '../test-support/fake-github'
import { repositoryPull } from './fake-pull'
import { RepositoryGitHub } from './fake-repository'

export const memberToken = 'queuer-token'
export const repository = 'Codertocat/Hello-World'

export function stackRepository() {
  const api = new RepositoryGitHub(new FakeGitHub())
  api.pulls[3] = repositoryPull({
    number: 3,
    baseRefName: 'changes',
    headRefName: 'layer-two',
    headRefOid: 'layer-two-head',
    isDraft: true,
  })
  api.pulls[4] = repositoryPull({
    number: 4,
    baseRefName: 'layer-two',
    headRefName: 'layer-three',
    headRefOid: 'layer-three-head',
  })
  api.branches.set('refs/heads/layer-two', 'layer-two-head')
  api.branches.set('refs/heads/layer-three', 'layer-three-head')
  return api
}
