declare module 'cloudflare:workers' {
  // Required ambient merge shape from the Cloudflare Vitest integration.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
