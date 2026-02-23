// netlify/functions/audit.js
// Server-side SEO audit: fetches homepage + known files, parses HTML, checks links.

const https = require("https");
const http = require("http");
const { URL } = require("url");

/* ── SSRF protection ────────────────────────────────────────── */
function isPrivateIP(hostname) {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  )
    return true;
  // IPv4 private ranges
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
    if (parts[0] === 0) return true;
  }
  return false;
}

function validateURL(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isPrivateIP(u.hostname)) return null;
  return u;
}

/* ── Fetch helper ───────────────────────────────────────────── */
function fetchURL(url, opts = {}) {
  const { method = "GET", maxBytes = 1024 * 1024, timeoutMs = 10000, maxRedirects = 3 } = opts;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      u,
      {
        method,
        timeout: timeoutMs,
        headers: {
          "User-Agent": "ELR-SEO-Audit/1.0",
          Accept: "text/html, application/xhtml+xml, */*",
        },
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
          let next;
          try {
            next = new URL(res.headers.location, url).href;
          } catch {
            return reject(new Error("Bad redirect"));
          }
          res.resume();
          return fetchURL(next, { ...opts, maxRedirects: maxRedirects - 1 }).then(resolve, reject);
        }
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          if (size > maxBytes) {
            res.destroy();
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8"), headers: res.headers, finalURL: url }));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
    req.end();
  });
}

/* ── HTML parsing helpers (regex-based, best-effort) ─────── */
function tag(html, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : "";
}

function allTags(html, name) {
  const re = new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  const res = [];
  let m;
  while ((m = re.exec(html))) res.push({ full: m[0], attrs: m[1] || "", content: m[2] });
  return res;
}

function selfClosingTags(html, name) {
  const re = new RegExp(`<${name}\\s([^>]*?)/?>`, "gi");
  const res = [];
  let m;
  while ((m = re.exec(html))) res.push(m[0]);
  return res;
}

/* ── Analyze homepage HTML ─────────────────────────────────── */
function analyzeHTML(html, baseURL) {
  // Title
  const titleText = tag(html, "title");
  const title = { present: titleText.length > 0, length: titleText.length };

  // Meta description
  const metaDescMatch = html.match(/<meta\s[^>]*name\s*=\s*["']description["'][^>]*>/i);
  let metaDescContent = "";
  if (metaDescMatch) metaDescContent = attr(metaDescMatch[0], "content");
  const metaDescription = { present: metaDescContent.length > 0, length: metaDescContent.length };

  // Canonical
  const canonicalMatch = html.match(/<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  const canonical = { present: !!canonicalMatch };

  // Open Graph
  function ogPresent(prop) {
    const re = new RegExp(`<meta\\s[^>]*property\\s*=\\s*["']og:${prop}["'][^>]*>`, "i");
    const m = html.match(re);
    if (!m) return false;
    return attr(m[0], "content").length > 0;
  }
  const openGraph = {
    hasOgTitle: ogPresent("title"),
    hasOgDescription: ogPresent("description"),
    hasOgImage: ogPresent("image"),
    hasOgUrl: ogPresent("url"),
  };

  // H1
  const h1s = allTags(html, "h1");
  const h1 = { count: h1s.length };

  // Headings order heuristic
  const headingMatches = html.match(/<h([1-6])[\s>]/gi) || [];
  const levels = headingMatches.map((m) => parseInt(m.match(/\d/)[0]));
  let hasOrderIssue = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) { hasOrderIssue = true; break; }
  }
  const h2Count = levels.filter((l) => l === 2).length;
  const headings = { h2Count, hasOrderIssue };

  // Images
  const imgs = selfClosingTags(html, "img").concat(
    (html.match(/<img\s[^>]*>/gi) || [])
  );
  // Deduplicate
  const uniqueImgs = [...new Set(imgs)];
  let missingAlt = 0;
  for (const i of uniqueImgs) {
    const a = attr(i, "alt");
    if (!a || a.trim().length === 0) missingAlt++;
  }
  const images = { total: uniqueImgs.length, missingAlt };

  // Schema JSON-LD
  const jsonLdTags = allTags(html, "script").filter(
    (s) => s.attrs && /type\s*=\s*["']application\/ld\+json["']/i.test(s.attrs)
  );
  const schema = { hasJsonLd: jsonLdTags.length > 0 };

  // Hreflang
  const hreflangMatch = html.match(/<link\s[^>]*hreflang\s*=\s*["'][^"']+["'][^>]*>/i);
  const hreflang = { present: !!hreflangMatch };

  // Links
  const allAnchors = html.match(/<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi) || [];
  let internal = 0, external = 0;
  const internalURLs = [];
  const base = new URL(baseURL);
  for (const a of allAnchors) {
    const href = attr(a, "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const resolved = new URL(href, baseURL);
      if (resolved.hostname === base.hostname) {
        internal++;
        internalURLs.push(resolved.href);
      } else {
        external++;
      }
    } catch {
      continue;
    }
  }
  const links = { total: internal + external, internal, external };

  return { title, metaDescription, canonical, openGraph, h1, headings, images, schema, hreflang, links, _internalURLs: internalURLs };
}

/* ── Broken link sample ────────────────────────────────────── */
async function checkBrokenLinks(urls, maxCount = 20) {
  const sample = [...new Set(urls)].slice(0, maxCount);
  let broken = 0;
  const promises = sample.map(async (u) => {
    try {
      const res = await fetchURL(u, { method: "HEAD", timeoutMs: 5000, maxRedirects: 3 });
      if (res.status >= 400) {
        // Fallback GET for servers that reject HEAD
        const res2 = await fetchURL(u, { method: "GET", timeoutMs: 5000, maxRedirects: 3, maxBytes: 1024 });
        if (res2.status >= 400) broken++;
      }
    } catch {
      broken++;
    }
  });
  await Promise.all(promises);
  return { checked: sample.length, broken };
}

/* ── Known files ───────────────────────────────────────────── */
async function checkFile(origin, path) {
  try {
    const res = await fetchURL(origin + path, { timeoutMs: 5000, maxBytes: 512 * 1024 });
    return { reachable: res.status >= 200 && res.status < 400, body: res.body };
  } catch {
    return { reachable: false, body: "" };
  }
}

/* ── Handler ───────────────────────────────────────────────── */
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const rawURL = (event.queryStringParameters || {}).url;
  if (!rawURL) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing ?url= parameter" }) };

  const parsed = validateURL(rawURL);
  if (!parsed) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid or blocked URL" }) };

  try {
    // Fetch homepage
    const homepageRes = await fetchURL(parsed.href, { maxBytes: 1024 * 1024, timeoutMs: 10000 });
    const html = homepageRes.body;
    const finalURL = homepageRes.finalURL;
    const origin = new URL(finalURL).origin;

    // Analyze HTML
    const analysis = analyzeHTML(html, finalURL);
    const { _internalURLs, ...homepage } = analysis;

    // Broken links sample
    const brokenLinkSample = await checkBrokenLinks(_internalURLs, 20);
    homepage.brokenLinkSample = brokenLinkSample;

    // Known files
    const [robotsRes, sitemapRes, llmsRes] = await Promise.all([
      checkFile(origin, "/robots.txt"),
      checkFile(origin, "/sitemap.xml"),
      checkFile(origin, "/llms.txt"),
    ]);

    // Check if sitemap is discoverable from robots.txt
    let discoveredFromRobots = false;
    let sitemapReachable = sitemapRes.reachable;
    if (robotsRes.reachable && robotsRes.body) {
      const sitemapLines = robotsRes.body.match(/^Sitemap:\s*(.+)$/gim);
      if (sitemapLines && sitemapLines.length > 0) {
        discoveredFromRobots = true;
        if (!sitemapReachable) {
          // Try the first Sitemap URL found in robots.txt
          const sitemapURL = sitemapLines[0].replace(/^Sitemap:\s*/i, "").trim();
          try {
            const altSitemap = await fetchURL(sitemapURL, { timeoutMs: 5000, maxBytes: 1024 });
            if (altSitemap.status >= 200 && altSitemap.status < 400) sitemapReachable = true;
          } catch { /* ignore */ }
        }
      }
    }

    // Detect analytics / GTM from HTML
    const hasGA4 = /gtag\(|google-analytics|googletagmanager\.com\/gtag/i.test(html);
    const hasGTM = /googletagmanager\.com\/gtm|GTM-[A-Z0-9]+/i.test(html);

    const result = {
      ok: true,
      urlFinal: finalURL,
      fetchedAt: new Date().toISOString(),
      homepage,
      files: {
        robotsTxt: { reachable: robotsRes.reachable },
        sitemapXml: { reachable: sitemapReachable, discoveredFromRobots },
        llmsTxt: { reachable: llmsRes.reachable },
      },
      extras: { hasGA4, hasGTM },
    };

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: "Fetch failed: " + err.message }) };
  }
};
