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
- The Durable Object in front of the container relays each chunk of an
  answer in its own code. In live tests, an answer that it passed on
  unchanged stopped after 1 to 12 minutes.
- The container runs [the egress proxy](../../tools/chatgpt-egress/proxy.ts)
  with `CHATGPT_EGRESS_PRIVATE_NETWORK=1`, because only its Durable Object
  can reach its port. The proxy calls only an `https` origin on
  `chatgpt.com` or a subdomain, and it drops the Cloudflare headers.
- When Cloudflare replaces the container, it sends `SIGTERM` and waits up
  to 15 minutes. The proxy then takes no new connection and lets each open
  answer finish.
- The proxy logs the method, the path, the status, and the duration of
  each request. It logs no body and no header value.

## Deploy

Each push to `main` deploys this Worker before the main Worker, when the
hash of its inputs changed, as
[Automatic deploys](../../docs/automatic-deploys.md#steps-of-a-run) says.
The deploy builds the image with Docker, so the deploy token needs the
Containers Edit permission.

To deploy by hand, run this from the repository root, with Docker running:

```sh
npx wrangler deploy --config worker/chatgpt-egress/wrangler.jsonc
```

The service binding of the main Worker needs this Worker to exist before
the first deploy of the main Worker.

## Development

- `npm run test -- worker/chatgpt-egress tools/chatgpt-egress` runs the
  relay and proxy tests.
- `node tools/chatgpt-egress/proxy.ts` runs the proxy outside a container.
  It then needs `CHATGPT_EGRESS_SECRET` or `CHATGPT_EGRESS_SECRET_FILE`,
  with at least 32 characters.

### Key Code

- [index.ts](index.ts): the Worker and the `ChatGptEgress` container class.
- [relay.ts](relay.ts): the relay of each answer chunk.
- [wrangler.jsonc](wrangler.jsonc): the container, its image, and the
  version binding.
- [egress-server.ts](../../tools/chatgpt-egress/egress-server.ts): the
  proxy server and its drain.
- [Dockerfile](../../tools/chatgpt-egress/Dockerfile): the container image.

### Related Docs

- [Model gateway](../../docs/protocol/model-gateway.md)
- [Components](../../docs/architecture/components.md#chatgpt-egress-worker)
- [Model gateway README](../model-gateway/README.md)
