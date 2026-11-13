// Builds the Unmeshed Workflow Showcase into ./dist
// Usage: node build.js        (Vercel runs this automatically)
// To add a workflow: add an entry to data/workflows.json and commit.

const fs = require("fs");
const path = require("path");

const SITE_URL = (process.env.SITE_URL || "https://unmeshed-showcase.vercel.app").replace(/\/$/, "");
const UN = "https://unmeshed.io";
const UTM = "?utm_source=showcase&utm_medium=referral";
const DIST = path.join(__dirname, "dist");

const STEP_DOCS = {
  "Integration": "/docs/refs/step-type-integration",
  "HTTP": "/docs/refs/step-type-http",
  "Javascript": "/docs/refs/step-type-javascript",
  "Python": "/docs/refs/step-type-python",
  "JQ": "/docs/refs/step-type-jq",
  "Switch": "/docs/refs/step-type-switch-case",
  "Parallel": "/docs/refs/step-type-parallel",
  "Foreach": "/docs/refs/step-type-foreach",
  "While": "/docs/refs/step-type-while",
  "Wait": "/docs/refs/step-type-wait",
  "LLM": "/docs/refs/llm",
  "Worker": "/docs/refs/step-type-worker",
  "Sub Process": "/docs/refs/step-type-sub-process",
  "Decision Table": "/docs/concepts/decision-table-rules",
};

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const docsUrl = t => (STEP_DOCS[t] ? UN + STEP_DOCS[t] : UN + "/docs/refs/step-definition");
const write = (rel, html) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};

const workflows = JSON.parse(fs.readFileSync(path.join(__dirname, "data/workflows.json"), "utf8"))
  .sort((a, b) => (b.episode || 0) - (a.episode || 0));

// ---------- shared layout ----------
function layout({ title, description, canonical, active = "", body, jsonld = null, extraHead = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE_URL}${canonical}">
<meta property="og:site_name" content="Unmeshed Workflow Showcase">
<meta name="twitter:card" content="summary">
<meta name="twitter:site" content="@unmeshedio">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
${extraHead}
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Unmeshed Workflow Showcase home"><img src="/assets/logo.png" alt="Unmeshed" width="120" height="30"><span>Workflow Showcase</span></a>
    <button class="menu-toggle" aria-label="Open menu" onclick="document.querySelector('.nav').classList.toggle('open')">&#9776;</button>
    <nav class="nav">
      <a href="/#workflows" class="${active === "workflows" ? "active" : ""}">Workflows</a>
      <a href="/tools/cron-to-workflow" class="${active === "cron" ? "active" : ""}">Cron &rarr; Workflow</a>
      <a href="${UN}/docs/start-here/getting-started">Docs</a>
      <a class="btn btn-primary btn-sm" href="${UN}/${UTM}">Try Unmeshed</a>
    </nav>
  </div>
</header>
<main>
${body}
</main>
<footer>
  <div class="wrap">
    <div>
      <a href="${UN}/"><img src="/assets/logo.png" alt="Unmeshed" width="104" height="26"></a>
      <p>Durable workflow orchestration from the creators of Netflix Conductor. Run APIs, AI agents and batch jobs reliably in production.</p>
    </div>
    <div>
      <h4>Showcase</h4>
      <ul>
        <li><a href="/#workflows">All workflows</a></li>
        <li><a href="/tools/cron-to-workflow">Cron &rarr; Workflow converter</a></li>
        <li><a href="https://www.youtube.com/@unmeshedio">Steal This Workflow on YouTube</a></li>
      </ul>
    </div>
    <div>
      <h4>Unmeshed</h4>
      <ul>
        <li><a href="${UN}/">unmeshed.io</a></li>
        <li><a href="${UN}/products/workflows">Workflow Orchestration</a></li>
        <li><a href="${UN}/products/api-orchestration">API Orchestration</a></li>
        <li><a href="${UN}/docs/start-here/getting-started">Documentation</a></li>
        <li><a href="${UN}/pricing">Pricing</a></li>
      </ul>
    </div>
    <div>
      <h4>Follow</h4>
      <ul>
        <li><a href="https://github.com/unmeshed">GitHub</a></li>
        <li><a href="https://www.linkedin.com/company/unmeshed-inc/">LinkedIn</a></li>
        <li><a href="https://www.youtube.com/@unmeshedio">YouTube</a></li>
        <li><a href="https://x.com/unmeshedio">X / Twitter</a></li>
      </ul>
    </div>
    <div class="legal">&copy; ${new Date().getFullYear()} <a href="${UN}/">Unmeshed, Inc.</a> &middot; Workflow recipes for <a href="${UN}/">Unmeshed</a>, the workflow orchestration platform.</div>
  </div>
</footer>
</body>
</html>`;
}

const miniFlow = w => w.steps.map(s => `<span class="dot">${esc(s.type)}</span>`).join('<span class="arrow">&rarr;</span>');

const card = w => `
<a class="card" href="/workflows/${w.id}" data-tags="${esc(w.tags.join("|"))}">
  <div class="card-top">
    <span class="ep">&#9654; Steal This Workflow &middot; Ep. ${w.episode}</span>
    <h3>${esc(w.title)}</h3>
    <p>${esc(w.summary)}</p>
  </div>
  <div class="mini-flow">${miniFlow(w)}</div>
  <div class="card-foot"><div class="tags">${w.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div><span class="go">View &rarr;</span></div>
</a>`;

// ---------- home ----------
function home() {
  const allTags = [...new Set(workflows.flatMap(w => w.tags))];
  const stepTypes = new Set(workflows.flatMap(w => w.steps.map(s => s.type)));
  const body = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Steal This Workflow &middot; by Unmeshed</p>
    <h1>Production-ready workflows<br><span class="u">you can steal.</span></h1>
    <p class="lead">Real-world workflow recipes built on <a href="${UN}/">Unmeshed</a>, the durable workflow orchestration platform from the creators of Netflix Conductor. Each one shows the trigger, every step, and a short video walkthrough.</p>
    <div class="btns">
      <a class="btn btn-primary" href="#workflows">Browse workflows</a>
      <a class="btn btn-outline" href="/tools/cron-to-workflow">Try the Cron &rarr; Workflow tool</a>
    </div>
    <div class="stats">
      <div><b>${workflows.length}</b>workflows</div>
      <div><b>${stepTypes.size}</b>step types used</div>
      <div><b>Weekly</b>new episodes</div>
    </div>
  </div>
</section>

<section id="workflows">
  <div class="wrap">
    <div class="section-head">
      <div><h2>Workflows</h2><p class="sub">New recipe every week. Click one to see the full flow and video.</p></div>
      <div class="filters">
        <button class="chip on" data-f="*">All</button>
        ${allTags.map(t => `<button class="chip" data-f="${esc(t)}">${esc(t)}</button>`).join("")}
      </div>
    </div>
    <div class="grid" id="grid">
      ${workflows.map(card).join("")}
      <div class="card coming">
        <div class="big">&#128337;</div>
        <h3>Next episode drops this week</h3>
        <p>Follow <a href="https://www.youtube.com/@unmeshedio">@unmeshedio</a> on YouTube to catch it first.</p>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="promo">
      <div>
        <p class="eyebrow">Free tool</p>
        <h2>Still running jobs on cron?</h2>
        <p class="sub" style="margin-bottom:20px">Paste any cron expression to see what it means in plain English, when it will run next, and how it looks as a retryable, observable Unmeshed workflow.</p>
        <a class="btn btn-primary" href="/tools/cron-to-workflow">Open the Cron &rarr; Workflow converter</a>
      </div>
      <pre class="mono"><span class="c"># before: silent failures</span>
0 2 * * 1-5  /scripts/sync.sh

<span class="c"># after: an Unmeshed schedule</span>
At 02:00, Monday through Friday
&rarr; retries, alerts, replay, audit log</pre>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="cta">
      <h2>Build your own in under an hour</h2>
      <p>Unmeshed runs workflows, API orchestration, batch jobs and AI agents on one engine. Free tier, no credit card required.</p>
      <a class="btn btn-primary" href="${UN}/${UTM}">Start free on unmeshed.io</a>
    </div>
  </div>
</section>

<script>
document.querySelectorAll('.chip').forEach(function (c) {
  c.addEventListener('click', function () {
    document.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
    c.classList.add('on');
    var f = c.getAttribute('data-f');
    document.querySelectorAll('#grid .card[data-tags]').forEach(function (card) {
      card.style.display = (f === '*' || card.getAttribute('data-tags').split('|').indexOf(f) > -1) ? '' : 'none';
    });
  });
});
</script>`;
  return layout({
    title: "Steal This Workflow: Unmeshed Workflow Showcase",
    description: "Production-ready workflow recipes built on Unmeshed, the workflow orchestration platform from the creators of Netflix Conductor. Webhooks, lead enrichment, AI agents and more.",
    canonical: "/",
    active: "workflows",
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Unmeshed Workflow Showcase",
      url: SITE_URL + "/",
      publisher: { "@type": "Organization", name: "Unmeshed", url: UN, sameAs: ["https://github.com/unmeshed", "https://www.linkedin.com/company/unmeshed-inc/", "https://www.youtube.com/@unmeshedio", "https://x.com/unmeshedio"] },
      hasPart: workflows.map(w => ({ "@type": "HowTo", name: w.title, url: `${SITE_URL}/workflows/${w.id}` })),
    },
  });
}

// ---------- workflow detail ----------
function detail(w) {
  const types = [...new Set(w.steps.map(s => s.type))];
  const others = workflows.filter(x => x.id !== w.id).slice(0, 4);
  const body = `
<div class="wrap">
  <div class="crumbs"><a href="/">Showcase</a> &nbsp;/&nbsp; <a href="/#workflows">Workflows</a> &nbsp;/&nbsp; ${esc(w.title)}</div>
  <div class="detail">
    <article>
      <span class="ep">&#9654; Steal This Workflow &middot; Ep. ${w.episode}</span>
      <h1>${esc(w.title)}</h1>
      <p class="lead">${esc(w.summary)}</p>
      <div class="tags">${w.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>

      <div class="block">
        <h2>The problem</h2>
        <div class="callout">${esc(w.problem)}</div>
      </div>

      <div class="block">
        <h2>The workflow</h2>
        <p class="sub" style="margin-bottom:16px"><b>Trigger:</b> ${esc(w.trigger)}</p>
        <div class="flow">
          ${w.steps.map((s, i) => `
          <div class="node">
            <div class="num">${i + 1}</div>
            <div class="body">
              <a class="type" href="${docsUrl(s.type)}" title="${esc(s.type)} step docs">${esc(s.type)}</a>
              <strong>${esc(s.name)}</strong>
              <p>${esc(s.detail)}</p>
            </div>
          </div>`).join("")}
        </div>
      </div>

      <div class="block">
        <h2>The result</h2>
        <div class="callout">${esc(w.outcome)}</div>
      </div>

      <div class="block">
        <h2>Why run this on Unmeshed</h2>
        <div class="why">
          <div><b>Retries built in</b>Configurable <a href="${UN}/docs/concepts/error-policies">error policies</a> handle flaky APIs without custom code.</div>
          <div><b>Step-level replay</b>Every run is recorded, so you can see and replay exactly what happened.</div>
          <div><b>AI and humans in the loop</b><a href="${UN}/docs/refs/llm">LLM steps</a> and <a href="${UN}/docs/refs/step-type-wait">wait steps</a> for approvals live in the same flow.</div>
          <div><b>Run anywhere</b>Unmeshed's cloud or your own, with no per-action fees. See <a href="${UN}/pricing">pricing</a>.</div>
        </div>
      </div>

      <div class="block">
        <div class="cta">
          <h2>Steal this workflow</h2>
          <p>Build ${esc(w.title.toLowerCase())} in Unmeshed. Free tier, no credit card required.</p>
          <a class="btn btn-primary" href="${UN}/${UTM}&utm_campaign=${w.id}">Build it on unmeshed.io</a>
        </div>
      </div>
    </article>

    <aside class="side">
      ${w.youtubeId ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(w.youtubeId)}" title="${esc(w.title)} video walkthrough" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
      <div class="panel">
        <h3>Step types used</h3>
        <ul>${types.map(t => `<li><a href="${docsUrl(t)}">${esc(t)} step &rarr;</a></li>`).join("")}</ul>
      </div>
      ${others.length ? `<div class="panel"><h3>More workflows</h3><ul>${others.map(o => `<li><a href="/workflows/${o.id}">Ep. ${o.episode}: ${esc(o.title)}</a></li>`).join("")}</ul></div>` : ""}
    </aside>
  </div>
</div>`;
  return layout({
    title: `${w.title} Workflow | Steal This Workflow by Unmeshed`,
    description: w.summary,
    canonical: `/workflows/${w.id}`,
    active: "workflows",
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `${w.title} workflow`,
      description: w.summary,
      url: `${SITE_URL}/workflows/${w.id}`,
      tool: [{ "@type": "HowToTool", name: "Unmeshed", url: UN }],
      step: w.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.detail })),
      ...(w.youtubeId ? { video: { "@type": "VideoObject", name: `${w.title} | Steal This Workflow`, description: w.summary, thumbnailUrl: `https://i.ytimg.com/vi/${w.youtubeId}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${w.youtubeId}`, uploadDate: w.uploadDate || "2026-11-01" } } : {}),
    },
  });
}

// ---------- cron tool ----------
function cronTool() {
  const body = fs.readFileSync(path.join(__dirname, "tools/cron-to-workflow.html"), "utf8")
    .replace(/\{\{UN\}\}/g, UN).replace(/\{\{UTM\}\}/g, UTM);
  return layout({
    title: "Cron to Workflow Converter: Explain Cron Expressions & Next Run Times | Unmeshed",
    description: "Free cron expression explainer. Paste a cron schedule to see it in plain English, list the next run times, and turn it into a retryable, observable Unmeshed workflow.",
    canonical: "/tools/cron-to-workflow",
    active: "cron",
    body,
    extraHead: '<script src="/assets/cron.js" defer></script>',
    jsonld: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Cron to Workflow Converter",
      url: SITE_URL + "/tools/cron-to-workflow",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "Unmeshed", url: UN },
    },
  });
}

// ---------- 404 ----------
const notFound = () => layout({
  title: "Page not found | Unmeshed Workflow Showcase",
  description: "This page doesn't exist.",
  canonical: "/404",
  body: `<section class="hero"><div class="wrap"><h1>Workflow not found</h1><p class="lead">This one may have moved. Browse all workflows instead.</p><div class="btns"><a class="btn btn-primary" href="/">Back to the showcase</a></div></div></section>`,
});

// ---------- run ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(__dirname, "assets"), path.join(DIST, "assets"), { recursive: true });

const ids = new Set();
for (const w of workflows) {
  for (const k of ["id", "episode", "title", "summary", "problem", "trigger", "tags", "steps", "outcome"]) {
    if (w[k] === undefined) throw new Error(`Workflow "${w.id || w.title}" is missing "${k}"`);
  }
  if (!/^[a-z0-9-]+$/.test(w.id)) throw new Error(`Workflow id "${w.id}" must be lowercase letters, numbers and dashes`);
  if (ids.has(w.id)) throw new Error(`Duplicate workflow id "${w.id}"`);
  ids.add(w.id);
  write(`workflows/${w.id}/index.html`, detail(w));
}
write("index.html", home());
write("tools/cron-to-workflow/index.html", cronTool());
write("404.html", notFound());

const urls = ["/", "/tools/cron-to-workflow", ...workflows.map(w => `/workflows/${w.id}`)];
const today = new Date().toISOString().slice(0, 10);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Built ${workflows.length} workflows + home + cron tool into dist/`);
