# ChatGPT egress

This page belongs to [the model gateway](README.md#model-requests). It
describes the transport used for ChatGPT requests.

OpenAI refuses the `chatgpt.com` requests that a Cloudflare Worker sends.
It returns HTTP 403 and a block page, and Codex then stops with "workspace routing discovery failed".
The gateway therefore sends each request for `chatgpt.com` or a `*.chatgpt.com` origin on another path.
It keeps the path, the query, the method, the headers, and the streamed body.
It adds `x-conductive-egress-origin` with the ChatGPT origin.
Every other upstream keeps the direct path.

1. With the `CHATGPT_EGRESS` service binding, the request goes to the [ChatGPT egress Worker](../chatgpt-egress/README.md) and its container.
   This path needs no secret, because that Worker has no public address.
2. Without the binding, and with both `CHATGPT_EGRESS_URL` and `CHATGPT_EGRESS_SECRET`, the request goes to that HTTPS proxy.
   It also carries `x-conductive-egress-secret` with the shared secret.
   [tools/chatgpt-egress/proxy.ts](../../tools/chatgpt-egress/proxy.ts) can serve this path behind a named Cloudflare Tunnel.
   A quick tunnel does not work, because it does not stream server-sent events.
3. Without either, or with an address that is not HTTPS, the gateway calls `chatgpt.com` directly.
