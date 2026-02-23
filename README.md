# SEO Checklist & Auto-Audit Tool

A bilingual (EN/FR) SEO checklist with automated website auditing and PageSpeed Insights integration. Designed for Netlify deployment and Webflow iframe embedding.

## Features

- **Auto-audit**: Paste a URL → get automated checks on meta tags, headings, images, robots.txt, sitemap, llms.txt, broken links, and more
- **PageSpeed Insights**: Automatic scores with partial-credit scoring curve
- **Bilingual**: Instant EN/FR toggle, all strings translated
- **Persistent**: localStorage saves checkboxes, scores, language, and audit results
- **Scoring**: Weighted impact multipliers (Critical/High/Medium/Low) with grade badge and progress bar
- **Responsive**: 2-column desktop, 1-column mobile, iframe-friendly

## Deploy to Netlify

### Option A: Git Deploy (Recommended)

1. Push this repo to GitHub/GitLab/Bitbucket
2. Log in to [Netlify](https://app.netlify.com)
3. Click **"Add new site" → "Import an existing project"**
4. Connect your repo
5. Build settings are auto-detected from `netlify.toml`:
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
6. Click **Deploy**

### Option B: Manual Deploy

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run `netlify deploy --prod` from this directory

### Optional: PageSpeed Insights API Key

Without an API key, PSI calls work but are rate-limited. To add one:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an API key
3. Enable the **PageSpeed Insights API**
4. In Netlify: **Site settings → Environment variables → Add**:
   - Key: `PSI_API_KEY`
   - Value: your API key

## Local Development

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Start local dev server (serves site + functions)
netlify dev
```

No Node dependencies are required — the project has zero `npm` packages.

## Embed in Webflow

### Basic iframe

Add an **Embed** element in Webflow with:

```html
<iframe
  src="https://YOUR-SITE.netlify.app"
  width="100%"
  height="2000"
  frameborder="0"
  style="border: none; background: #131313;"
  loading="lazy"
  title="SEO Checklist"
></iframe>
```

### Auto-resize (optional)

To make the iframe auto-resize to fit its content, add this script in Webflow's **Project Settings → Custom Code → Footer Code**:

```html
<script>
window.addEventListener("message", function (e) {
  if (e.data && e.data.type === "elr-seo-resize" && e.data.height) {
    var iframes = document.querySelectorAll('iframe[src*="YOUR-SITE.netlify.app"]');
    iframes.forEach(function (iframe) {
      iframe.style.height = e.data.height + "px";
    });
  }
});
</script>
```

Replace `YOUR-SITE.netlify.app` with your actual Netlify URL.

## File Structure

```
/
├── index.html                    # HTML shell
├── styles.css                    # Dark theme + responsive layout
├── app.js                        # All logic, data, scoring, persistence
├── netlify.toml                  # Netlify config
├── netlify/
│   └── functions/
│       ├── audit.js              # Server-side SEO audit
│       └── pagespeed.js          # PSI API proxy
└── README.md                     # This file
```

## Scoring Model

- **Base points**: 10 per item
- **Impact multipliers**: Critical ×1.6, High ×1.2, Medium ×1.0, Low ×0.6
- **PageSpeed partial credit**:
  - Score ≥ 80 → 100% credit
  - Score 50–79 → 50–100% (linear)
  - Score < 50 → 0–50% (linear)
- **Grade**: A (≥80%, green), B (≥60%, yellow), C (≥40%, orange), D (<40%, red)

## License

MIT
# Seo-audit
