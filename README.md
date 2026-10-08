# Arya Vora — engineering & experiments

A Next.js portfolio with an interactive robot schematic, illustrated project gallery, searchable GitHub workbench, and browser-only pathfinding and agent-workflow demos.

- Design decisions, research sources, and limitations: [docs/redesign.md](docs/redesign.md)
- Main composition: `src/components/portfolio/Portfolio.tsx`
- Curated content: `src/data/portfolio.ts`
- GitHub snapshot refresh: `npm run data:github`
- Games (`/games`, served at games.arya-vora.org via a host rewrite in `next.config.ts`): `src/app/games/`, data in `src/data/games.ts`

## Checks

```sh
npm ci
npx playwright install chromium
npm run lint
npm run build
npm test -- --workers=4
```

Tests start a production server on port 3100. They cover desktop/mobile interactions, accessibility, reduced motion, no-JavaScript content, and screenshots. Rebuild before running tests after source edits. Regenerate the social card with `node scripts/render-social-image.mjs`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
