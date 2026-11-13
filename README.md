# Steal This Workflow: Unmeshed Workflow Showcase

Production-ready workflow recipes built on [Unmeshed](https://unmeshed.io), the durable workflow orchestration platform from the creators of Netflix Conductor, plus a free **Cron → Workflow converter**.

Live site: https://unmeshed-showcase.vercel.app

## Add a new workflow (weekly)

1. Open `data/workflows.json`.
2. Copy an existing entry and change the values:

| Field | What to put |
| --- | --- |
| `id` | URL slug, lowercase with dashes, e.g. `invoice-approval` → `/workflows/invoice-approval` |
| `episode` | Episode number (newest shows first) |
| `title`, `summary` | Name and one-sentence description |
| `problem`, `outcome` | The pain before and the result after |
| `trigger` | What starts the workflow |
| `tags` | 2–3 tags; they become the filter buttons |
| `youtubeId` | The ID from the YouTube link, e.g. `ldGS5CaVGAQ` from `youtube.com/shorts/ldGS5CaVGAQ` |
| `steps` | Each step's `type`, `name` and `detail` |

Step `type` values that link to the Unmeshed docs automatically: `Integration`, `HTTP`, `Javascript`, `Python`, `JQ`, `Switch`, `Parallel`, `Foreach`, `While`, `Wait`, `LLM`, `Worker`, `Sub Process`, `Decision Table`.

3. Commit. Vercel rebuilds and the new page, home card and sitemap entry go live automatically.

The build stops with a clear error if a field is missing or an `id` is duplicated, so a broken entry never goes live.

## Run locally

```bash
node build.js        # outputs to dist/
npx serve dist       # preview at http://localhost:3000
```

No dependencies. Needs Node 18+.
