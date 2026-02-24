/* ================================================================
   SEO Checklist + Auto-Audit Tool — app.js
   Pure JS, no dependencies. Bilingual EN/FR.
   ================================================================ */

(function () {
    "use strict";

    /* ── i18n strings ──────────────────────────────────────── */
    const I18N = {
        auditTitle: { en: "Analyze your website", fr: "Analyser votre site web" },
        analyzeBtn: { en: "Analyze", fr: "Analyser" },
        auditDisclaimer: {
            en: "Auto-checks are best-effort and primarily based on the homepage.",
            fr: "Les vérifications automatiques sont indicatives et basées surtout sur la page d'accueil."
        },
        psiTitle: { en: "PageSpeed Insights results", fr: "Résultats PageSpeed Insights" },
        resetConfirm: { en: "Reset all progress for this page?", fr: "Réinitialiser la progression de cette page ?" },
        resetBtn: { en: "Reset", fr: "Réinitialiser" },
        prioritiesTitle: { en: "Remaining priorities", fr: "Priorités restantes" },
        analyzingMsg: { en: "Analyzing…", fr: "Analyse en cours…" },
        analyzeError: { en: "Error: ", fr: "Erreur : " },
        analyzeDone: { en: "Audit complete.", fr: "Audit terminé." },
        psiRunning: { en: "Running PageSpeed…", fr: "PageSpeed en cours…" },
        psiDone: { en: "PageSpeed complete.", fr: "PageSpeed terminé." },
        psiError: { en: "PageSpeed error: ", fr: "Erreur PageSpeed : " },
        status0: { en: "Needs work", fr: "À corriger" },
        status1: { en: "Improving", fr: "En progrès" },
        status2: { en: "Strong", fr: "Solide" },
        status3: { en: "Excellent", fr: "Excellent" },
        impactCritical: { en: "Critical", fr: "Critique" },
        impactHigh: { en: "High", fr: "Élevé" },
        impactMedium: { en: "Medium", fr: "Moyen" },
        impactLow: { en: "Low", fr: "Faible" },
        auto: { en: "Auto", fr: "Auto" },
        stepFetch: { en: "Fetching homepage…", fr: "Récupération de la page d'accueil…" },
        stepMeta: { en: "Checking meta tags & headings…", fr: "Vérification des balises meta et titres…" },
        stepLinks: { en: "Scanning links & images…", fr: "Analyse des liens et images…" },
        stepFiles: { en: "Checking robots.txt, sitemap, llms.txt…", fr: "Vérification robots.txt, sitemap, llms.txt…" },
        stepBroken: { en: "Testing sample links for errors…", fr: "Test d'un échantillon de liens…" },
        stepPSI: { en: "Running PageSpeed Insights (may take 20-30s)…", fr: "Exécution de PageSpeed Insights (peut prendre 20-30s)…" },
        stepDone: { en: "Analysis complete ✓", fr: "Analyse terminée ✓" },
    };

    /* ── Impact multipliers ────────────────────────────────── */
    const IMPACT_MULT = { Critical: 1.6, High: 1.2, Medium: 1.0, Low: 0.6 };
    const BASE_POINTS = 10;

    /* ── PageSpeed metrics ─────────────────────────────────── */
    const PSI_METRICS = [
        { key: "performance", en: "Performance", fr: "Performance", impact: "Critical" },
        { key: "accessibility", en: "Accessibility", fr: "Accessibilité", impact: "High" },
        { key: "bestPractices", en: "Best Practices", fr: "Bonnes pratiques", impact: "Medium" },
        { key: "seo", en: "SEO", fr: "SEO", impact: "Critical" },
    ];

    /* ── Checklist data ────────────────────────────────────── */
    const GROUPS = [
        {
            id: "general",
            en: "General / Strategy",
            fr: "Général / Stratégie",
            items: [
                { id: "general_structure_navigation", en: "Plan a clear site structure and navigation", fr: "Planifier une structure de site et une navigation claires", impact: "High", auto: false },
                { id: "responsive_design", en: "Ensure site is responsive for desktop and mobile", fr: "Assurer un design responsive (ordinateur et mobile)", impact: "High", auto: false },
                { id: "heading_hierarchy", en: "Use a logical header hierarchy (H1-H6) for clear content structure", fr: "Utiliser une hiérarchie de titres logique (H1 à H6)", impact: "High", auto: true },
                { id: "nav_menu", en: "Design a logical and user-friendly navigation menu", fr: "Concevoir un menu de navigation simple et intuitif", impact: "High", auto: false },
                { id: "clean_urls", en: "Create clear and intuitive page URLs", fr: "Créer des URLs de pages claires et cohérentes", impact: "High", auto: false },
                { id: "meta_titles_descriptions_all_pages", en: "Create meta titles and meta descriptions for each page", fr: "Créer un meta title et une meta description pour chaque page", impact: "Critical", auto: true },
                { id: "open_graph_basic", en: "Set up Open Graph settings for social sharing", fr: "Configurer les balises Open Graph pour le partage social", impact: "Medium", auto: true },
                { id: "image_alt_text", en: "Add descriptive alt text to images", fr: "Ajouter un texte alternatif (alt) descriptif aux images", impact: "High", auto: true },
                { id: "lighthouse_speed_test", en: "Ensure the site is fast and smooth (PageSpeed/Lighthouse)", fr: "S'assurer que le site est rapide et fluide (PageSpeed/Lighthouse)", impact: "High", auto: true },
                { id: "broken_links", en: "Make sure there is no page with broken links (sample)", fr: "S'assurer qu'aucune page n'a de liens brisés (échantillon)", impact: "High", auto: true },
            ],
        },
        {
            id: "keywords",
            en: "Keyword research and optimization",
            fr: "Recherche de mots-clés et optimisation",
            items: [
                { id: "keyword_research", en: "Do keyword research for your industry and services", fr: "Faire une recherche de mots-clés pour votre industrie et vos services", impact: "High", auto: false },
                { id: "one_keyword_per_page", en: "Target one keyword per page and optimize headings for it", fr: "Cibler un mot-clé par page et optimiser les titres pour celui-ci", impact: "High", auto: false },
                { id: "meta_includes_keyword", en: "Write meta titles/descriptions that include the target keyword", fr: "Écrire des meta titles/descriptions qui contiennent le mot-clé ciblé", impact: "High", auto: false },
                { id: "meta_title_length", en: "Keep the meta title between 50 and 60 characters", fr: "Garder le meta title entre 50 et 60 caractères", impact: "High", auto: false },
                { id: "external_links_relevant", en: "Add external links to relevant, trustworthy resources", fr: "Ajouter des liens externes vers des ressources pertinentes", impact: "High", auto: false },
                { id: "internal_linking", en: "Add internal links across the site (internal linking)", fr: "Ajouter des liens internes entre les pages (maillage interne)", impact: "High", auto: false },
            ],
        },
        {
            id: "tools",
            en: "Tools and tracking",
            fr: "Outils et suivi",
            items: [
                { id: "google_search_console", en: "Set up Google Search Console", fr: "Configurer Google Search Console", impact: "Critical", auto: false },
                { id: "analytics_tool", en: "Set up analytics tools (GA4, Plausible, etc.)", fr: "Configurer un outil d'analytics (GA4, Plausible, etc.)", impact: "Medium", auto: true },
                { id: "google_business_profile_link", en: "Add your website link to Google Business Profile and elsewhere", fr: "Ajouter le lien du site dans Google Business Profile et ailleurs", impact: "High", auto: false },
                { id: "google_tag_manager", en: "Set up Google Tag Manager", fr: "Configurer Google Tag Manager", impact: "Medium", auto: true },
            ],
        },
        {
            id: "launch",
            en: "Website Launch",
            fr: "Mise en ligne du site",
            items: [
                { id: "submit_sitemap_gsc", en: "Submit your sitemap to Google Search Console", fr: "Soumettre le sitemap dans Google Search Console", impact: "Critical", auto: false },
                { id: "proper_404_page", en: "Set up a proper 404 page with useful navigation", fr: "Configurer une page 404 utile avec de la navigation", impact: "High", auto: false },
                { id: "minify_assets", en: "Minify CSS, JavaScript, and HTML", fr: "Minifier CSS, JavaScript et HTML", impact: "High", auto: false },
                { id: "compress_images", en: "Compress images to improve load speed", fr: "Compresser les images pour améliorer la vitesse", impact: "High", auto: false },
                { id: "canonical_tag_global", en: "Set a global canonical tag", fr: "Définir une balise canonique globale", impact: "High", auto: true },
                { id: "open_graph_tags", en: "Set up proper Open Graph tags (og:)", fr: "Configurer correctement les balises Open Graph (og:)", impact: "Medium", auto: true },
            ],
        },
        {
            id: "seo_opt",
            en: "SEO optimization",
            fr: "Optimisation SEO",
            items: [
                { id: "schema_markup", en: "Implement schema markup (Schema.org)", fr: "Implémenter du balisage Schema.org", impact: "Medium", auto: true },
                { id: "localized_seo_webflow", en: "Implement localized SEO (hreflang, localization)", fr: "Mettre en place du SEO localisé (hreflang, localisation)", impact: "High", auto: true },
                { id: "regular_site_audits", en: "Run regular site audits (Ahrefs, Semrush, etc.)", fr: "Faire des audits réguliers (Ahrefs, Semrush, etc.)", impact: "Critical", auto: false },
                { id: "robots_txt", en: "Create a robots.txt file", fr: "Créer un fichier robots.txt", impact: "Medium", auto: true },
                { id: "sitemap_xml", en: "Ensure you have an XML sitemap", fr: "S'assurer d'avoir un sitemap XML", impact: "High", auto: true },
            ],
        },
        {
            id: "ai_opt",
            en: "AI optimization",
            fr: "Optimisation IA",
            items: [
                { id: "llms_txt", en: "Ensure you have an llms.txt file", fr: "S'assurer d'avoir un fichier llms.txt", impact: "High", auto: true },
            ],
        },
    ];

    /* ── Storage ───────────────────────────────────────────── */
    const BASE_KEY = "elr_seo_checklist_v1";
    function storageKey() { return BASE_KEY + ":" + location.pathname; }

    function loadState() {
        try { return JSON.parse(localStorage.getItem(storageKey())) || {}; } catch { return {}; }
    }
    function saveState(s) {
        try { localStorage.setItem(storageKey(), JSON.stringify(s)); } catch { /* quota */ }
    }

    /* ── State ─────────────────────────────────────────────── */
    let state = Object.assign(
        { lang: "en", lastURL: "", checks: {}, psi: {}, audit: null, auditTS: null },
        loadState()
    );

    function persist() { saveState(state); }

    /* ── Helpers ───────────────────────────────────────────── */
    function t(key) { const e = I18N[key]; return e ? (e[state.lang] || e.en) : key; }
    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    /* ── Scoring ───────────────────────────────────────────── */
    function psiPartialCredit(score) {
        const s = Math.max(0, Math.min(100, score || 0));
        if (s >= 80) return 1.0;
        if (s >= 50) return 0.5 + ((s - 50) / 30) * 0.5;
        return (s / 50) * 0.5;
    }

    function computeScore() {
        let earned = 0, max = 0;
        // Checklist items
        const allItems = [];
        GROUPS.forEach(function (g) {
            g.items.forEach(function (item) {
                const mult = IMPACT_MULT[item.impact] || 1;
                const pts = BASE_POINTS * mult;
                max += pts;
                if (state.checks[item.id]) earned += pts;
                allItems.push(item);
            });
        });
        // PSI
        PSI_METRICS.forEach(function (m) {
            const mult = IMPACT_MULT[m.impact] || 1;
            const mMax = BASE_POINTS * mult;
            max += mMax;
            const val = state.psi[m.key];
            if (val != null && val !== "") {
                earned += mMax * psiPartialCredit(Number(val));
            }
        });
        const pct = max > 0 ? Math.round(Math.max(0, Math.min(100, (earned / max) * 100))) : 0;
        // Top 5 unchecked
        const unchecked = allItems
            .filter(function (item) { return !state.checks[item.id]; })
            .map(function (item) {
                return { item: item, weight: BASE_POINTS * (IMPACT_MULT[item.impact] || 1) };
            })
            .sort(function (a, b) { return b.weight - a.weight; })
            .slice(0, 5);
        return { earned: Math.round(earned * 10) / 10, max: Math.round(max * 10) / 10, pct: pct, unchecked: unchecked };
    }

    /* ── Grade ─────────────────────────────────────────────── */
    function gradeInfo(pct) {
        if (pct >= 80) return { grade: "A", color: "#22c55e", status: t("status3") };
        if (pct >= 60) return { grade: "B", color: "#eab308", status: t("status2") };
        if (pct >= 40) return { grade: "C", color: "#f97316", status: t("status1") };
        return { grade: "D", color: "#ef4444", status: t("status0") };
    }

    /* ── Render score ──────────────────────────────────────── */
    function renderScore() {
        var s = computeScore();
        var g = gradeInfo(s.pct);

        $("#scoreValue").textContent = s.earned + " / " + s.max;
        $("#scorePct").textContent = s.pct + "%";
        var badge = $("#gradeBadge");
        badge.textContent = g.grade;
        badge.style.background = g.color;
        $("#scoreStatus").textContent = g.status;
        var fill = $("#progressFill");
        fill.style.width = s.pct + "%";
        fill.style.background = g.color;

        // Priorities
        $("#prioritiesTitle").textContent = t("prioritiesTitle");
        var list = $("#prioritiesList");
        list.innerHTML = "";
        s.unchecked.forEach(function (u) {
            var li = document.createElement("li");
            li.textContent = u.item[state.lang] || u.item.en;
            list.appendChild(li);
        });
    }

    /* ── Render i18n ───────────────────────────────────────── */
    function renderI18N() {
        $$("[data-i18n]").forEach(function (el) {
            var key = el.getAttribute("data-i18n");
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.placeholder = t(key);
            } else {
                el.textContent = t(key);
            }
        });
        // Reset button
        $("#resetBtn").textContent = t("resetBtn");
        // Update HTML lang
        document.documentElement.lang = state.lang;
    }

    /* ── Impact pill helper ────────────────────────────────── */
    function impactPill(impact) {
        var cls = "pill pill-" + impact.toLowerCase();
        var label = t("impact" + impact);
        return '<span class="' + cls + '">' + label + "</span>";
    }

    /* ── Render PageSpeed card ─────────────────────────────── */
    function renderPSI() {
        var grid = $("#psiGrid");
        grid.innerHTML = "";
        PSI_METRICS.forEach(function (m) {
            var div = document.createElement("div");
            div.className = "psi-field";
            var val = state.psi[m.key] != null ? state.psi[m.key] : "";
            div.innerHTML =
                '<label for="psi_' + m.key + '">' + (m[state.lang] || m.en) + " " + impactPill(m.impact) + '</label>' +
                '<input type="number" id="psi_' + m.key + '" min="0" max="100" placeholder="0–100" value="' + val + '">';
            grid.appendChild(div);
        });
        // Bind
        PSI_METRICS.forEach(function (m) {
            var inp = document.getElementById("psi_" + m.key);
            inp.addEventListener("input", function () {
                var v = inp.value.trim();
                state.psi[m.key] = v === "" ? "" : Math.max(0, Math.min(100, parseInt(v, 10) || 0));
                persist();
                renderScore();
            });
        });
    }

    /* ── Render checklist groups ───────────────────────────── */
    function renderGroups() {
        var grid = $("#groupsGrid");
        grid.innerHTML = "";
        GROUPS.forEach(function (group) {
            var card = document.createElement("div");
            card.className = "card";
            var title = document.createElement("div");
            title.className = "card-title";
            title.textContent = group[state.lang] || group.en;
            card.appendChild(title);

            group.items.forEach(function (item) {
                var row = document.createElement("div");
                row.className = "check-item";

                var cb = document.createElement("input");
                cb.type = "checkbox";
                cb.id = "cb_" + item.id;
                cb.checked = !!state.checks[item.id];
                cb.addEventListener("change", function () {
                    state.checks[item.id] = cb.checked;
                    persist();
                    renderScore();
                });

                var wrapper = document.createElement("div");
                var lbl = document.createElement("label");
                lbl.htmlFor = "cb_" + item.id;
                lbl.textContent = item[state.lang] || item.en;
                wrapper.appendChild(lbl);

                var meta = document.createElement("div");
                meta.className = "check-meta";
                meta.innerHTML = impactPill(item.impact);
                if (item.auto) {
                    meta.innerHTML += ' <span class="pill pill-auto">' + t("auto") + "</span>";
                }
                wrapper.appendChild(meta);

                // Auto-detail line
                if (item.auto && state.audit) {
                    var detail = getAutoDetail(item.id, state.audit);
                    if (detail) {
                        var detailEl = document.createElement("div");
                        detailEl.className = "auto-detail";
                        detailEl.textContent = detail;
                        wrapper.appendChild(detailEl);
                    }
                }

                row.appendChild(cb);
                row.appendChild(wrapper);
                card.appendChild(row);
            });

            grid.appendChild(card);
        });
    }

    /* ── Auto-check mapping ────────────────────────────────── */
    function getAutoDetail(id, audit) {
        var hp = audit.homepage || {};
        var files = audit.files || {};
        var extras = audit.extras || {};
        var l = state.lang;
        switch (id) {
            case "heading_hierarchy":
                if (hp.h1) {
                    var ok = hp.h1.count === 1 && !hp.headings.hasOrderIssue;
                    return ok
                        ? (l === "fr" ? "H1 unique détecté, hiérarchie OK" : "Single H1 found, hierarchy OK")
                        : (l === "fr" ? "H1: " + hp.h1.count + ", problème d'ordre: " + (hp.headings.hasOrderIssue ? "oui" : "non")
                            : "H1 count: " + hp.h1.count + ", order issue: " + (hp.headings.hasOrderIssue ? "yes" : "no"));
                }
                return null;
            case "meta_titles_descriptions_all_pages":
                if (hp.title) {
                    return (l === "fr" ? "Title: " : "Title: ") + (hp.title.present ? "✓" : "✗") +
                        " (" + hp.title.length + " chars) · Meta desc: " + (hp.metaDescription && hp.metaDescription.present ? "✓" : "✗");
                }
                return null;
            case "open_graph_basic":
            case "open_graph_tags":
                if (hp.openGraph) {
                    var og = hp.openGraph;
                    var parts = [];
                    if (og.hasOgTitle) parts.push("og:title ✓");
                    if (og.hasOgDescription) parts.push("og:desc ✓");
                    if (og.hasOgImage) parts.push("og:image ✓");
                    return parts.length > 0 ? parts.join(", ") : (l === "fr" ? "Aucune balise OG détectée" : "No OG tags detected");
                }
                return null;
            case "image_alt_text":
                if (hp.images) {
                    return (l === "fr"
                        ? hp.images.total + " images, " + hp.images.missingAlt + " sans alt"
                        : hp.images.total + " images, " + hp.images.missingAlt + " missing alt");
                }
                return null;
            case "broken_links":
                if (hp.brokenLinkSample) {
                    return (l === "fr"
                        ? hp.brokenLinkSample.checked + " liens vérifiés, " + hp.brokenLinkSample.broken + " brisés"
                        : hp.brokenLinkSample.checked + " links checked, " + hp.brokenLinkSample.broken + " broken");
                }
                return null;
            case "analytics_tool":
                return extras.hasGA4
                    ? (l === "fr" ? "GA4/gtag détecté" : "GA4/gtag detected")
                    : (l === "fr" ? "Non détecté" : "Not detected");
            case "google_tag_manager":
                return extras.hasGTM
                    ? (l === "fr" ? "GTM détecté" : "GTM detected")
                    : (l === "fr" ? "Non détecté" : "Not detected");
            case "canonical_tag_global":
                if (hp.canonical) {
                    return hp.canonical.present
                        ? (l === "fr" ? "Canonical détecté" : "Canonical found")
                        : (l === "fr" ? "Canonical non trouvé" : "Canonical not found");
                }
                return null;
            case "schema_markup":
                if (hp.schema) {
                    return hp.schema.hasJsonLd
                        ? (l === "fr" ? "JSON-LD détecté" : "JSON-LD found")
                        : (l === "fr" ? "JSON-LD non trouvé" : "JSON-LD not found");
                }
                return null;
            case "localized_seo_webflow":
                if (hp.hreflang) {
                    return hp.hreflang.present
                        ? (l === "fr" ? "Hreflang détecté" : "Hreflang found")
                        : (l === "fr" ? "Hreflang non trouvé" : "Hreflang not found");
                }
                return null;
            case "robots_txt":
                return files.robotsTxt
                    ? (files.robotsTxt.reachable ? "robots.txt ✓" : "robots.txt ✗")
                    : null;
            case "sitemap_xml":
                return files.sitemapXml
                    ? (files.sitemapXml.reachable ? "sitemap.xml ✓" : "sitemap.xml ✗")
                    : null;
            case "llms_txt":
                return files.llmsTxt
                    ? (files.llmsTxt.reachable ? "llms.txt ✓" : "llms.txt ✗")
                    : null;
            case "lighthouse_speed_test":
                if (state.psi.performance != null && state.psi.performance !== "") {
                    return "Performance: " + state.psi.performance + "/100";
                }
                return null;
            default:
                return null;
        }
    }

    function applyAutoChecks(audit) {
        var hp = audit.homepage || {};
        var files = audit.files || {};
        var extras = audit.extras || {};
        var map = {};

        // heading_hierarchy: single H1, no order issue
        if (hp.h1 && hp.headings) {
            map.heading_hierarchy = hp.h1.count === 1 && !hp.headings.hasOrderIssue;
        }

        // meta_titles_descriptions_all_pages: title + meta desc present
        if (hp.title && hp.metaDescription) {
            map.meta_titles_descriptions_all_pages = hp.title.present && hp.metaDescription.present;
        }

        // open_graph_basic + open_graph_tags
        if (hp.openGraph) {
            var ogOK = hp.openGraph.hasOgTitle && hp.openGraph.hasOgDescription && hp.openGraph.hasOgImage;
            map.open_graph_basic = ogOK;
            map.open_graph_tags = ogOK;
        }

        // image_alt_text
        if (hp.images) {
            map.image_alt_text = hp.images.missingAlt === 0 && hp.images.total > 0;
        }

        // broken_links
        if (hp.brokenLinkSample) {
            map.broken_links = hp.brokenLinkSample.broken === 0 && hp.brokenLinkSample.checked > 0;
        }

        // analytics_tool
        map.analytics_tool = !!extras.hasGA4;

        // google_tag_manager
        map.google_tag_manager = !!extras.hasGTM;

        // canonical_tag_global
        if (hp.canonical) map.canonical_tag_global = hp.canonical.present;

        // schema_markup
        if (hp.schema) map.schema_markup = hp.schema.hasJsonLd;

        // localized_seo_webflow
        if (hp.hreflang) map.localized_seo_webflow = hp.hreflang.present;

        // robots_txt
        if (files.robotsTxt) map.robots_txt = files.robotsTxt.reachable;

        // sitemap_xml
        if (files.sitemapXml) map.sitemap_xml = files.sitemapXml.reachable;

        // llms_txt
        if (files.llmsTxt) map.llms_txt = files.llmsTxt.reachable;

        // Apply: set checked state (user can override later)
        Object.keys(map).forEach(function (id) {
            state.checks[id] = map[id];
        });
    }

    function applyPSIAutoCheck() {
        // lighthouse_speed_test: auto-check if performance >= 70
        if (state.psi.performance != null && state.psi.performance !== "") {
            state.checks.lighthouse_speed_test = Number(state.psi.performance) >= 70;
        }
    }

    /* ── PSI API key (public, rate-limited) ────────────────── */
    var PSI_API_KEY = "AIzaSyCms6qScOKvGQ6yVAcI1IqSEEbaVBjvkvY";

    /* ── Analyze ───────────────────────────────────────────── */
    function normalizeURL(raw) {
        var u = raw.trim();
        if (!u) return null;
        if (!/^https?:\/\//i.test(u)) u = "https://" + u;
        try { new URL(u); } catch { return null; }
        if (!/^https?:/i.test(new URL(u).protocol)) return null;
        return u;
    }

    /* ── Animated loading steps ─────────────────────────────── */
    var AUDIT_STEPS = [
        { key: "stepFetch", id: "as_fetch" },
        { key: "stepMeta", id: "as_meta" },
        { key: "stepLinks", id: "as_links" },
        { key: "stepFiles", id: "as_files" },
        { key: "stepBroken", id: "as_broken" },
        { key: "stepPSI", id: "as_psi" },
    ];

    function createStepsUI(container) {
        container.innerHTML = "";
        var wrap = document.createElement("div");
        wrap.className = "audit-steps";
        wrap.id = "auditSteps";
        AUDIT_STEPS.forEach(function (s) {
            var row = document.createElement("div");
            row.className = "audit-step";
            row.id = s.id;
            row.innerHTML =
                '<span class="step-icon pending" id="' + s.id + '_icon"></span>' +
                '<span class="step-label">' + t(s.key) + '</span>' +
                '<span class="step-time" id="' + s.id + '_time"></span>';
            wrap.appendChild(row);
        });
        container.appendChild(wrap);
    }

    function setStep(id, status, elapsed) {
        var row = document.getElementById(id);
        var icon = document.getElementById(id + "_icon");
        var timeEl = document.getElementById(id + "_time");
        if (!row) return;
        row.classList.add("visible");
        row.classList.remove("active", "done", "error");
        icon.className = "step-icon";
        if (status === "running") {
            row.classList.add("active");
            icon.classList.add("running");
            icon.textContent = "";
        } else if (status === "done") {
            row.classList.add("done");
            icon.classList.add("success");
            icon.textContent = "✓";
        } else if (status === "error") {
            row.classList.add("error");
            icon.classList.add("fail");
            icon.textContent = "✗";
        }
        if (elapsed != null && timeEl) {
            timeEl.textContent = (elapsed / 1000).toFixed(1) + "s";
        }
    }

    function revealStep(id) {
        var row = document.getElementById(id);
        if (row) { row.classList.add("visible"); }
    }

    /* ── Fetch PSI directly from browser (bypasses Netlify timeout) */
    async function fetchPSIDirect(url) {
        var apiURL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
            "?url=" + encodeURIComponent(url) +
            "&strategy=mobile" +
            "&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO" +
            "&key=" + PSI_API_KEY;

        var resp = await fetch(apiURL);
        var data = await resp.json();

        if (data.error) throw new Error(data.error.message || "PSI API error");

        var cats = data.lighthouseResult && data.lighthouseResult.categories;
        if (!cats) throw new Error("No Lighthouse data returned");

        function safeScore(cat) {
            if (!cat || cat.score == null) return 0;
            return Math.round(cat.score * 100);
        }
        return {
            performance: safeScore(cats.performance),
            accessibility: safeScore(cats.accessibility),
            bestPractices: safeScore(cats["best-practices"]),
            seo: safeScore(cats.seo),
        };
    }

    async function runAnalyze() {
        var urlInput = $("#auditURL");
        var statusEl = $("#auditStatus");
        var btn = $("#analyzeBtn");
        var url = normalizeURL(urlInput.value);

        if (!url) {
            statusEl.className = "audit-status error";
            statusEl.textContent = state.lang === "fr" ? "URL invalide" : "Invalid URL";
            return;
        }

        state.lastURL = url;
        urlInput.value = url;
        btn.disabled = true;
        statusEl.className = "audit-status loading";
        statusEl.textContent = "";

        // Build animated steps UI
        createStepsUI(statusEl);

        // Stagger reveal steps
        var stepIds = AUDIT_STEPS.map(function (s) { return s.id; });
        for (var si = 0; si < stepIds.length; si++) {
            (function (idx) {
                setTimeout(function () { revealStep(stepIds[idx]); }, idx * 80);
            })(si);
        }

        var t0, elapsed;

        // ─── Step 1-5: Audit via Netlify function ───
        t0 = Date.now();
        setTimeout(function () { setStep("as_fetch", "running"); }, 0);
        setTimeout(function () { setStep("as_meta", "running"); }, 200);
        setTimeout(function () { setStep("as_links", "running"); }, 400);
        setTimeout(function () { setStep("as_files", "running"); }, 600);
        setTimeout(function () { setStep("as_broken", "running"); }, 800);

        try {
            var auditRes = await fetch("/.netlify/functions/audit?url=" + encodeURIComponent(url))
                .then(function (r) { return r.json(); });

            elapsed = Date.now() - t0;

            if (auditRes.ok) {
                state.audit = auditRes;
                state.auditTS = new Date().toISOString();
                applyAutoChecks(auditRes);
                setStep("as_fetch", "done", elapsed);
                setStep("as_meta", "done", elapsed);
                setStep("as_links", "done", elapsed);
                setStep("as_files", "done", elapsed);
                setStep("as_broken", "done", elapsed);
            } else {
                setStep("as_fetch", "error", elapsed);
                setStep("as_meta", "error", elapsed);
                setStep("as_links", "error", elapsed);
                setStep("as_files", "error", elapsed);
                setStep("as_broken", "error", elapsed);
                console.warn("[SEO Audit] Audit error:", auditRes.error);
            }
        } catch (e) {
            elapsed = Date.now() - t0;
            setStep("as_fetch", "error", elapsed);
            setStep("as_meta", "error", elapsed);
            setStep("as_links", "error", elapsed);
            setStep("as_files", "error", elapsed);
            setStep("as_broken", "error", elapsed);
            console.error("[SEO Audit] Audit exception:", e);
        }

        // ─── Step 6: PageSpeed (direct browser call) ───
        t0 = Date.now();
        setStep("as_psi", "running");

        try {
            var scores = await fetchPSIDirect(url);
            elapsed = Date.now() - t0;
            console.log("[SEO Audit] PSI scores:", scores);

            state.psi = {
                performance: scores.performance,
                accessibility: scores.accessibility,
                bestPractices: scores.bestPractices,
                seo: scores.seo,
            };
            applyPSIAutoCheck();
            setStep("as_psi", "done", elapsed);
        } catch (e) {
            elapsed = Date.now() - t0;
            console.error("[SEO Audit] PSI error:", e);
            setStep("as_psi", "error", elapsed);
        }

        // ─── Finalize ───
        persist();
        renderPSI();
        renderGroups();
        renderScore();
        btn.disabled = false;

        // Show completion message after a beat
        setTimeout(function () {
            var doneRow = document.createElement("div");
            doneRow.className = "audit-step visible";
            doneRow.style.opacity = "1";
            doneRow.style.fontWeight = "600";
            doneRow.innerHTML =
                '<span class="step-icon success">✓</span>' +
                '<span class="step-label">' + t("stepDone") + '</span>';
            var wrap = $("#auditSteps");
            if (wrap) wrap.appendChild(doneRow);
        }, 400);
    }

    /* ── Full render ───────────────────────────────────────── */
    function renderAll() {
        renderI18N();
        renderPSI();
        renderGroups();
        renderScore();

        // Restore URL
        if (state.lastURL) {
            $("#auditURL").value = state.lastURL;
        }
    }

    /* ── Init ──────────────────────────────────────────────── */
    function init() {
        renderAll();

        // Language toggle
        $$(".lang-toggle button").forEach(function (btn) {
            btn.addEventListener("click", function () {
                state.lang = btn.getAttribute("data-lang");
                $$(".lang-toggle button").forEach(function (b) { b.classList.remove("active"); });
                btn.classList.add("active");
                persist();
                renderAll();
            });
            // Set active on load
            if (btn.getAttribute("data-lang") === state.lang) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Analyze button
        $("#analyzeBtn").addEventListener("click", runAnalyze);

        // Enter key on URL input
        $("#auditURL").addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); runAnalyze(); }
        });

        // Reset button
        $("#resetBtn").addEventListener("click", function () {
            if (confirm(t("resetConfirm"))) {
                try { localStorage.removeItem(storageKey()); } catch { /* */ }
                state = { lang: state.lang, lastURL: "", checks: {}, psi: {}, audit: null, auditTS: null };
                persist();
                renderAll();
                // Clear URL input
                $("#auditURL").value = "";
                // Clear audit status
                $("#auditStatus").textContent = "";
                $("#auditStatus").className = "audit-status";
            }
        });

        // PostMessage for iframe auto-resize
        function postHeight() {
            try {
                var h = document.documentElement.scrollHeight;
                window.parent.postMessage({ type: "elr-seo-resize", height: h }, "*");
            } catch { /* */ }
        }
        // Observe size changes
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(postHeight).observe(document.body);
        }
        window.addEventListener("load", postHeight);
    }

    // Boot
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
