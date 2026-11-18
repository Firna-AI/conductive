# ChatGPT egress Worker

OpenAI refuses the requests to `chatgpt.com` that a Cloudflare Worker
sends. It accepts them from a Cloudflare container. This Worker,
`conductive-chatgpt-egress`, owns that container, the egress container.
The model gateway of the main Worker sends each request of a ChatGPT
sign-in here, through the service binding `CHATGPT_EGRESS`.
[Requests and answers](../../docs/protocol/model-gateway.md#requests-and-answers)
states the rules.

## What it does

- It has no route and no `workers.dev` address. Only the main Worker
  reaches it.
- Each request goes to the container instance of the deployed version.
  A new version takes new requests at once. The instance of an old version
  finishes its open answers, then sleeps after 15 minutes without a
  request.
- The container application uses the `durable_object` scheduling policy,
  which is in public beta. Each Durable Object starts the image of its
  own Worker version through the Durable Object Container API, so a
  deploy replaces no running container. Cloudflare's deprecated
  `@cloudflare/containers` helper does not support this policy, so the
  Worker does not use it.
- A start reaches the Internet and sets an inactivity timeout of 15
  minutes, so the container keeps streaming while its object sleeps.
  Requests that arrive during a start wait for the port of the proxy.
- `code_update_strategy` lets the Durable Object of an old version keep
  its code for up to 15 minutes after a deploy, so that its open answers
  can finish.
- The Durable Object in front of the container relays each chunk of an
  answer in its own code. In live tests, an answer that it passed on
  unchanged stopped after 1 to 12 minutes.
- The container runs [the egress proxy](../../tools/chatgpt-egress/proxy.ts)
  with `CHATGPT_EGRESS_PRIVATE_NETWORK=1`, because only its Durable Object
  can reach its port. The proxy calls only an `https` origin on
  `chatgpt.com` or a subdomain, and it drops the Cloudflare headers.
- When Cloudflare stops the container, it sends `SIGTERM` and waits up to
  15 minutes. The proxy then takes no new connection and lets each open
  answer finish.
- The proxy logs the method, the path, the status, and the duration of
  each request. It logs no body and no header value.

## Deploy

Each push to `main` deploys this Worker before the main Worker, unless the
last complete egress deploy had the same inputs and its version is still
live, as [Automatic deploys](../../docs/automatic-deploys.md#steps-of-a-run)
says.
The deploy builds the image with Docker, so the deploy token needs the
Containers Edit permission.

To deploy by hand, run this from the repository root, with Docker running:

```sh
npx wrangler deploy --config worker/chatgpt-egress/wrangler.jsonc
```

The service binding of the main Worker needs this Worker to exist before
the first deploy of the main Worker.

The scheduling policy of a container application cannot change. To change
it, delete the application with `npx wrangler containers delete <id>`
before the deploy. That stops its running containers.

## Development

- `npm run test -- worker/chatgpt-egress tools/chatgpt-egress` runs the
  start, relay, and proxy tests.
- `node tools/chatgpt-egress/proxy.ts` runs the proxy outside a container.
  It then needs `CHATGPT_EGRESS_SECRET` or `CHATGPT_EGRESS_SECRET_FILE`,
  with at least 32 characters.

### Key Code

- [index.ts](index.ts): the Worker and the `ChatGptEgress` container class.
- [relay.ts](relay.ts): the relay of each answer chunk.
- [container.ts](container.ts): the start of the container and the wait
  for its port.
- [wrangler.jsonc](wrangler.jsonc): the container, its image, and the
  version binding.
- [egress-server.ts](../../tools/chatgpt-egress/egress-server.ts): the
  proxy server and its drain.
- [Dockerfile](../../tools/chatgpt-egress/Dockerfile): the container image.

### Related Docs

- [Model gateway](../../docs/protocol/model-gateway.md)
- [Components](../../docs/architecture/components.md#chatgpt-egress-worker)
- [Model gateway README](../model-gateway/README.md)
