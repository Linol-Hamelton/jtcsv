# Framework integration examples

These directories are **reference snippets**, not published npm packages.
They show how to wire `jtcsv` into common client-side and full-stack
frameworks. Copy the code into your own project and adapt — there is no
`@jtcsv/<framework>` package to install for these.

## Why examples and not packages?

For client-side frameworks (Vue, Svelte, Angular) and meta-frameworks
that mostly delegate to fetch + a parsing call (Remix, Nuxt, SvelteKit,
tRPC), the value-add of a wrapper package is thin: you spend more energy
matching the framework's lifecycle conventions than benefiting from a
unified API. The published packages are reserved for the cases where a
real middleware / module abstraction earns its keep — see
[../../plugins/](../../plugins/):

| Published as       | Framework              |
|--------------------|------------------------|
| `@jtcsv/express`   | Express ^4 \|\| ^5     |
| `@jtcsv/fastify`   | Fastify ^4 \|\| ^5     |
| `@jtcsv/nextjs`    | Next.js ^13 \|\| ^14 \|\| ^15 |
| `@jtcsv/hono`      | Hono ^4                |
| `@jtcsv/nestjs`    | NestJS ^9 \|\| ^10 \|\| ^11 |

## Examples in this folder

- [angular/](angular/)     — service + component
- [nuxt/](nuxt/)           — server route handler
- [remix/](remix/)         — loader + action
- [svelte/](svelte/)       — store + component
- [sveltekit/](sveltekit/) — endpoint
- [trpc/](trpc/)           — procedure
- [vue/](vue/)             — composable + component

If you need a published wrapper for any of these, open an issue with the
use case — we'll move it back to `plugins/` and ship it.
