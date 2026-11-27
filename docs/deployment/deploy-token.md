# The deploy token

This page belongs to [Automatic deploys](../automatic-deploys.md). It
gives the permissions of the Cloudflare API token of the deploy, and
how to limit its R2 access to one bucket.

`CLOUDFLARE_API_TOKEN` needs these permissions. A user token and an
account-owned token both work.

| Permission | Scope | Resource | What uses it |
| --- | --- | --- | --- |
| Workers Scripts Edit | Account | The account of the Worker | `wrangler deploy`: the Worker, its assets, its cron trigger, its URL settings, and its custom domains |
| D1 Edit | Account | The account of the Worker | The D1 migrations |
| Workers R2 Storage Edit | Account | The account of the Worker | The upload of Conductive release files |
| Workers Routes Edit | Zone | `conductive.page` | The route `*.conductive.page/*` |
| Zone Read | Zone | `conductive.page` | Wrangler finds the zone of that route by its name |
| Containers Edit | Account | The account of the Worker | The image and the instances of the [ChatGPT egress Worker](../../worker/chatgpt-egress/README.md) |

- With Workers Routes Edit on all zones of the account, Wrangler sets the
  route in one call and needs no Zone Read.
- The zone `conductive.build` needs no permission. Its custom domains use
  Workers Scripts Edit.
- The deploy needs no user permission, because the run gives Wrangler the
  account ID.
- The template "Edit Cloudflare Workers" holds more permissions, such as
  Workers KV Storage and Workers Tail, but no Zone Read. With the template
  and specific zones, add Zone Read on `conductive.page`.
- A missing permission makes the run fail. The Wrangler error names the
  Cloudflare API request that failed.

Workers R2 Storage Edit also lets the token write to every other bucket of
the account. To limit R2 to the bucket `conductive-runner`, make the token
through the API. Give it the same permissions, with two changes:

- Leave out the account group `Workers R2 Storage Write`.
- Add the bucket group `Workers R2 Storage Bucket Item Write` on the bucket
  `conductive-runner`.

The S3 key pair of the upload then reaches only that bucket.
[The release in each deploy](runner-archive.md#the-release-in-each-deploy)
describes that upload. The API names each Edit permission with Write, as
in `D1 Write`.
