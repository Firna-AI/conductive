/**
 * The words of the repository changes that the org image does not hold
 * yet: the repository notice of the Repositories and Cloud computer tabs,
 * and the waiting repositories of New workspace. The mockups and the app
 * share them. A waiting repository is a chosen repository that the org
 * image does not hold yet.
 */

/**
 * How the saved repository changes wait for the org image. The first state
 * that applies wins: the newest build failed and no build runs, a build
 * runs while an added repository waits, or else the changes wait for a
 * build, such as after a removal or a start that failed. A refresh never
 * counts as a build that runs.
 */
export const repositoryWaits = ['failed', 'building', 'waiting'] as const

export type RepositoryWait = (typeof repositoryWaits)[number]

/** Names in a sentence: "a", "a and b", or "a, b, and c". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(' and ')
  const last = names[names.length - 1]
  return `${names.slice(0, -1).join(', ')}, and ${last}`
}

/** When an added repository is ready, in each state. */
const readyWhen: Readonly<Record<RepositoryWait, string>> = {
  failed: 'after a build succeeds',
  building: 'after the build',
  waiting: 'after the next build',
}

/** The note of a waiting repository in the repository menu of New workspace. */
export const menuNotes: Readonly<Record<RepositoryWait, string>> = {
  failed: 'Ready after a build succeeds',
  building: 'Ready after the build',
  waiting: 'Ready after the next build',
}

/** A title that says when the named repositories are ready. */
function readyTitle(names: readonly string[], wait: RepositoryWait): string {
  const verb = names.length === 1 ? 'is' : 'are'
  return `${listNames(names)} ${verb} ready ${readyWhen[wait]}`
}

/** "leaves" or "leave", for the removed repositories. */
function leave(names: readonly string[]): string {
  return `${listNames(names)} ${names.length === 1 ? 'leaves' : 'leave'}`
}

/** The states in which an admin has an action: Try again or Build computer. */
type ActionWait = Exclude<RepositoryWait, 'building'>

/**
 * What a member reads about the action of an admin. Each sentence leaves
 * out its full stop, so that another clause can follow it.
 */
const adminCan: Readonly<Record<ActionWait, string>> = {
  failed: 'An admin can try it again',
  waiting: 'An admin can start the build',
}

/** The title and the body of a notice. */
export type NoticeText = { title: string; body?: string }

/**
 * The words of the repository notice. The title names the added
 * repositories, or else the removed ones. While a build runs, it names the
 * added ones only. An admin gets Try again or Build computer, in the notice
 * on the Repositories tab or in the build card under it on the Cloud
 * computer tab, so only a member reads who can act.
 */
export function repositoryNoticeText(props: {
  wait: RepositoryWait
  added: readonly string[]
  removed: readonly string[]
  admin: boolean
}): NoticeText {
  const { added, removed } = props
  if (props.wait === 'building' && added.length > 0) {
    return { title: readyTitle(added, 'building') }
  }
  // A removal alone never counts as a build that runs for it.
  const wait: ActionWait = props.wait === 'failed' ? 'failed' : 'waiting'
  const leaves =
    wait === 'failed' ? 'after a build succeeds' : 'at the next build'
  const title =
    added.length > 0 ? readyTitle(added, wait) : `${leave(removed)} ${leaves}`
  const sentences: string[] = []
  if (added.length > 0 && removed.length > 0) {
    sentences.push(`${leave(removed)} at the same build.`)
  }
  if (wait === 'failed') sentences.push('The last build failed.')
  if (!props.admin) sentences.push(`${adminCan[wait]}.`)
  return { title, body: sentences.length > 0 ? sentences.join(' ') : undefined }
}

/**
 * What a person can do while the repository of a New workspace form waits,
 * in each state. `alternative` says that another chosen repository is
 * ready, so the person can choose it and send now.
 */
function waitingFormBody(props: {
  wait: RepositoryWait
  names: readonly string[]
  alternative: boolean
  admin: boolean
}): string {
  const { alternative } = props
  if (props.wait === 'building') {
    const ready = props.names.length === 1 ? "it's" : "they're"
    const send = `You can send when ${ready} ready`
    return alternative ? `${send}, or choose another repository.` : `${send}.`
  }
  const failed = props.wait === 'failed'
  let act: string
  if (props.admin) {
    const fix = failed ? 'Try it again' : 'Build the computer'
    act = alternative
      ? `${fix}, or choose another repository.`
      : `${fix} to send your message.`
  } else {
    const member = adminCan[props.wait]
    act = alternative
      ? `${member}, or you can choose another repository.`
      : `${member}.`
  }
  return failed ? `The last build failed. ${act}` : act
}

/**
 * The words of the notice of New workspace while the repository of the
 * form waits, such as in a kept draft, or while no chosen repository is
 * ready. `names` holds the repository of the form, or every chosen one
 * when none is ready.
 */
export function waitingFormText(props: {
  wait: RepositoryWait
  names: readonly string[]
  alternative: boolean
  admin: boolean
}): NoticeText {
  return {
    title: readyTitle(props.names, props.wait),
    body: waitingFormBody(props),
  }
}
