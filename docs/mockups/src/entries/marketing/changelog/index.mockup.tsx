import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { changelogSamplePosts } from '../../../fixtures/changelogPosts'
import { ChangelogScreen } from '../../../screens/ChangelogScreen'

const changelogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['posts'],
  properties: {
    /** The sample posts, or no posts, which shows the empty state. */
    posts: { enum: ['sample', 'none'] },
  },
} as const

export const changelog = defineScreen({
  title: 'Changelog',
  description: `The changelog page, at /changelog, with the header and the footer of the site. The top has the label, the title, and one sentence that links the releases on GitHub for the complete list of changes. Then comes one post for each day with a release, newest first. A post shows its day, its title, its versions, a lead when it has one, and up to three sections in the order New, Improved, and Fixed, each with one change on each line. On a computer, the day stands in a column of its own beside the post, and it stays in view while the post scrolls. A phone shows the day above the title. The day links to the address of its post, such as changelog#2026-11-12. The ${changelogSamplePosts.length} sample posts show a day with a lead and all three sections, a day with six versions, and a day with fixes only. The Product column of the footer links here. The child page empty shows the page without posts.`,
  rationale:
    'The user chose curated posts on 12 November 2026: a routine drafts one post for each day with a release, and a person reviews it. Releases come several times a day, so one post for each day keeps the page short to scan. The versions let a Mac user match a post to the installed version. Each version shows in full, not as a range, so the find of the browser finds the installed version. The sections keep the order New, Improved, and Fixed, so a reader sees what is new first, and a post leaves out a section without changes. The day of a post is its address, so a link can point to one day. The day is a plain link to that address, so a visitor copies it without a script. One page holds every post, with no pages of posts, because the site has only a few days of posts. The page runs no script, so it has no filter. The header keeps its links, because a phone header has no free width, so the footer links the page, as it links the comparison page. The words come from src/marketing/changelog-copy.ts, which holds the words of the page for the site and the mockup, and each post has the shape of src/marketing/changelog-model.ts. The posts here are samples, not the posts of the site. No text names the provider of the cloud computers.',
  relatedDocs: [],
  address: `${productDomain}/changelog`,
  propSchema: changelogSchema,
  props: { posts: 'sample' },
  render: (props, context) => (
    <ChangelogScreen
      posts={props.posts === 'sample' ? changelogSamplePosts : []}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'Changelog, no posts',
      description:
        'The changelog page without posts: the top, with its link to the releases on GitHub, then one line under a hairline that says that the first post comes with the next release.',
      props: { posts: 'none' },
    },
  ],
})
