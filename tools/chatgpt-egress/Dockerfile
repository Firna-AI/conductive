# The ChatGPT egress container. The egress Worker in worker/chatgpt-egress
# builds and deploys it. Only that Worker can reach its port.
FROM node:24-alpine
WORKDIR /app
RUN printf '{"type":"module"}\n' > package.json
COPY egress-server.ts proxy.ts ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 CHATGPT_EGRESS_PRIVATE_NETWORK=1
EXPOSE 8080
USER node
CMD ["node", "proxy.ts"]
