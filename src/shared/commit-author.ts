import type { User } from './api'

export type CommitAuthor = { name: string; email: string }

export function commitAuthor(
  user: Pick<User, 'githubId' | 'githubLogin' | 'displayName'>,
): CommitAuthor {
  const displayName = user.displayName?.trim() ?? ''
  const usableName = [...displayName].some(
    (character) =>
      character.charCodeAt(0) > 32 && !',:;<>"\\\''.includes(character),
  )
  return {
    name: usableName ? displayName : user.githubLogin,
    email: `${user.githubId}+${user.githubLogin}@users.noreply.github.com`,
  }
}

export function commitAuthorEnvironment(author: CommitAuthor) {
  return {
    GIT_AUTHOR_NAME: author.name,
    GIT_AUTHOR_EMAIL: author.email,
    GIT_COMMITTER_NAME: author.name,
    GIT_COMMITTER_EMAIL: author.email,
  }
}
