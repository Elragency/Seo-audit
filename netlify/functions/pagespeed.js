// netlify/functions/pagespeed.js
// Proxy to Google PageSpeed Insights API v5.

const https = require("https");
const { URL } = require("url");

/* ── SSRF protection ────────────────────────────────────────── */
function isPrivateIP(hostname) {
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") return true;
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
        if (parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
        if (parts[0] === 0) return true;
    }
    return false;
}

function validateURL(raw) {
    let u;
    try { u = new URL(raw); } catch { return null; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (isPrivateIP(u.hostname)) return null;
    return u;
}

/* ── Handler ───────────────────────────────────────────────── */
exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
    };

    const rawURL = (event.queryStringParameters || {}).url;
    if (!rawURL) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing ?url= parameter" }) };

    const parsed = validateURL(rawURL);
    if (!parsed) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid or blocked URL" }) };

    const apiKey = process.env.PSI_API_KEY || "AIzaSyCms6qScOKvGQ6yVAcI1IqSEEbaVBjvkvY";

    let apiURL = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(parsed.href)}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    if (apiKey) apiURL += `&key=${apiKey}`;

    return new Promise((resolve) => {
        const req = https.get(apiURL, { timeout: 30000 }, (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
                const raw = Buffer.concat(chunks).toString("utf-8");
                try {
                    const data = JSON.parse(raw);
                    if (data.error) {
                        return resolve({ statusCode: 502, headers, body: JSON.stringify({ ok: false, error: data.error.message || "PSI error" }) });
                    }
                    const cats = data.lighthouseResult && data.lighthouseResult.categories;
                    if (!cats) {
                        console.log("[PSI] No categories in response. Keys:", Object.keys(data));
                        if (data.lighthouseResult) console.log("[PSI] lighthouseResult keys:", Object.keys(data.lighthouseResult));
                        return resolve({ statusCode: 502, headers, body: JSON.stringify({ ok: false, error: "No lighthouse data returned" }) });
                    }
                    console.log("[PSI] Category keys:", Object.keys(cats));
                    function safeScore(cat) {
                        if (!cat || cat.score == null) return 0;
                        return Math.round(cat.score * 100);
                    }
                    const scores = {
                        performance: safeScore(cats.performance),
                        accessibility: safeScore(cats.accessibility),
                        bestPractices: safeScore(cats["best-practices"]),
                        seo: safeScore(cats.seo),
                    };
                    console.log("[PSI] Extracted scores:", scores);
                    resolve({ statusCode: 200, headers, body: JSON.stringify({ ok: true, url: parsed.href, strategy: "mobile", scores }) });
                } catch {
                    resolve({ statusCode: 502, headers, body: JSON.stringify({ ok: false, error: "Failed to parse PSI response" }) });
                }
            });
            res.on("error", (err) => {
                resolve({ statusCode: 502, headers, body: JSON.stringify({ ok: false, error: err.message }) });
            });
        });
        req.on("timeout", () => { req.destroy(); resolve({ statusCode: 504, headers, body: JSON.stringify({ ok: false, error: "PSI request timed out" }) }); });
        req.on("error", (err) => {
            resolve({ statusCode: 502, headers, body: JSON.stringify({ ok: false, error: err.message }) });
        });
    });
};
