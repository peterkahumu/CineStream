// src/blocklist.ts
var STATIC_BLOCKLIST = [
  // ── Google Ads / Analytics ───────────────────────────────────────────────
  "doubleclick.net",
  "googlesyndication.com",
  "googletagmanager.com",
  "googletagservices.com",
  "google-analytics.com",
  "adservice.google.com",
  "imasdk.googleapis.com",
  "securepubads.g.doubleclick.net",
  // ── Major Programmatic Ad Networks ───────────────────────────────────────
  "adnxs.com",
  // AppNexus / Xandr
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "adsrvr.org",
  // The Trade Desk
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "revcontent.com",
  "sharethrough.com",
  "triplelift.com",
  "33across.com",
  "smartadserver.com",
  "lijit.com",
  // Sovrn
  "sovrn.com",
  "advertising.com",
  "yieldmo.com",
  "indexexchange.com",
  "casalemedia.com",
  // Index Exchange
  "contextweb.com",
  // PulsePoint
  "conversantmedia.com",
  "amazon-adsystem.com",
  "adtechus.com",
  "bidswitch.net",
  "lkqd.net",
  "moatads.com",
  "adsafeprotected.com",
  // IAS
  "sizmek.com",
  "flashtalking.com",
  "appnexus.com",
  "yldbt.com",
  // Yieldbird
  "mediamath.com",
  "lotame.com",
  "rlcdn.com",
  // Rocketship
  "rfihub.com",
  "demdex.net",
  // Adobe Audience Manager
  "everesttech.net",
  // Adobe Ad Cloud
  "adobedtm.com",
  // ── Pop-under / Redirect Networks (common on streaming sites) ────────────
  "popads.net",
  "popcash.net",
  "propellerads.com",
  "adcash.com",
  "exoclick.com",
  "trafficjunky.net",
  "juicyads.com",
  "hilltopads.net",
  "plugrush.com",
  "push.house",
  "admaven.com",
  "zeropark.com",
  "richpush.co",
  "evadav.com",
  "adsterra.com",
  "clickadu.com",
  "adskeeper.co.uk",
  "pushground.com",
  "dads.io",
  "megapush.net",
  "pushpush.net",
  "alfasubs.com",
  "goldads.net",
  "onclicka.com",
  "onclickads.net",
  "onclick.io",
  "clickain.com",
  "popunder.net",
  "rockyou.com",
  // ── Tracking / Data Brokers ───────────────────────────────────────────────
  "scorecardresearch.com",
  "quantserve.com",
  "bluekai.com",
  "krxd.net",
  // Krux / Salesforce DMP
  "addthis.com",
  "sharethis.com",
  "chartbeat.com",
  "parsely.com",
  "comscore.com",
  "nielsen.com",
  "omtrdc.net",
  // Adobe Analytics
  "mxpnl.com",
  // Mixpanel
  "segment.com",
  "segment.io",
  "heapanalytics.com",
  "mouseflow.com",
  "hotjar.com",
  "fullstory.com",
  "logrocket.com",
  "crazyegg.com",
  // ── Coin-miners & Malvertising ────────────────────────────────────────────
  "coinhive.com",
  "coin-hive.com",
  "crypto-loot.com",
  "minero.cc",
  "jsecoin.com",
  "miner.pr0gramm.com",
  "ppoi.org"
];

// src/adCss.ts
var AD_HIDING_CSS = `
/* \u2500\u2500 Generic ad container patterns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="ad-wrap"], [class*="ad-container"], [class*="adcontainer"],
[class*="ad-banner"], [class*="ad-slot"], [class*="ad-unit"],
[class*="advertisement"], [class*="ads-container"], [class*="ads-wrap"],
[id*="ad-container"], [id*="ad-wrapper"], [id*="adcontainer"],
[id*="ad_container"], [id*="banner-ad"], [id*="ad-banner"],
[id*="ad-slot"], [id*="ad-unit"],

/* \u2500\u2500 ExoClick \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[id^="exo-"], .exo-ad, [class*="exoClick"],

/* \u2500\u2500 PropellerAds \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[id^="propeller-"], [class*="propeller-ad"],

/* \u2500\u2500 PopAds / onclick overlays \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[id*="pop_"], [id*="overlay_ad"], [class*="overlay-ad"],

/* \u2500\u2500 Floating / sticky banners \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="sticky-ad"], [class*="floating-ad"], [class*="fixed-ad"],
[class*="bottom-ad"], [class*="top-ad"],

/* \u2500\u2500 Player overlay ads \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="player-ad"], [class*="preroll"], [class*="midroll"],
[class*="video-ad"], [id*="video-ad"], [id*="player-ad"],

/* \u2500\u2500 Push notification prompts \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="push-notification"], [class*="push-prompt"],
[id*="push-notification"], [id*="push-prompt"],

/* \u2500\u2500 Popup / interstitial overlays \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="popup-ad"], [class*="interstitial"], [class*="modal-ad"],
[class*="lightbox-ad"],

/* \u2500\u2500 Native ad widgets (Taboola / Outbrain / RevContent) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="taboola"], [id*="taboola"], [class*="outbrain"], [id*="outbrain"],
[class*="revcontent"], [id*="revcontent"],
[class*="mgid"], [id*="mgid"],

/* \u2500\u2500 Adsterra \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[class*="adsterra"], [id*="adsterra"],

/* \u2500\u2500 Generic iframe-based ad holders \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
iframe[id*="google_ads"], iframe[name*="google_ads"],
iframe[id*="aswift"], iframe[id*="adfox"],

/* \u2500\u2500 Suppress hidden countdown overlays used by pop-unders \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
[id*="countdown"], [class*="countdown-overlay"], [class*="skip-ad"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
}

/* \u2500\u2500 Prevent page-level blur / freeze tricks used during redirects */
body { pointer-events: auto !important; filter: none !important; }
`;

// src/locationSpoof.ts
function buildLocationSpoofScript() {
  return (
    /* js */
    `function(targetOrigin) {
  try {
    var targetUrl = new URL(targetOrigin);

    /* \u2500\u2500 Block new-window popups (pop-unders) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    var _nativeOpen = window.open;
    window.open = function(url, target, features) {
      if (!url) return null;
      var resolved = url.toString();
      // Allow same-page navigations (fullscreen helpers etc.)
      if (resolved.startsWith('/') || resolved.startsWith(targetOrigin)) {
        return _nativeOpen.call(window, url, target, features);
      }
      return null;
    };

    /* \u2500\u2500 Suppress alert/confirm spam \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    window.alert   = function() {};
    window.confirm = function() { return false; };
    // Keep prompt \u2014 some players use it for password/PIN entry

    /* \u2500\u2500 Block top-level navigation redirects \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    var _assign   = window.location.assign.bind(window.location);
    var _replace  = window.location.replace.bind(window.location);
    Object.defineProperty(window, '_realAssign',  { value: _assign,  writable: false });
    Object.defineProperty(window, '_realReplace', { value: _replace, writable: false });

    /* \u2500\u2500 Spoof window.location \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    var locationProxy = new Proxy(window.location, {
      get: function(target, prop) {
        if (prop === 'hostname') return targetUrl.hostname;
        if (prop === 'host')     return targetUrl.host;
        if (prop === 'origin')   return targetOrigin;
        if (prop === 'protocol') return targetUrl.protocol;
        if (prop === 'href')     return target.href.replace(window.location.origin, targetOrigin);
        // Passthrough for everything else (pathname, search, hash, assign, replace\u2026)
        var val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });

    try {
      Object.defineProperty(window, 'location', {
        get: function() { return locationProxy; },
        configurable: true
      });
    } catch(_) {}

    /* \u2500\u2500 Spoof document.referrer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    try {
      Object.defineProperty(document, 'referrer', {
        get: function() { return targetOrigin + '/'; },
        configurable: true
      });
    } catch(_) {}

    /* \u2500\u2500 Try document.domain (may throw in strict mode) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    try { document.domain = targetUrl.hostname; } catch(_) {}

  } catch(e) {
    // Silently degrade \u2014 some hardened environments block defineProperty on window
  }
}`
  );
}

// src/index.ts
var PRIVATE_IP_RE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;
function isPrivateHost(hostname) {
  return PRIVATE_IP_RE.test(hostname);
}
function isAllowedDomain(hostname, allowed) {
  if (allowed.length === 0) return true;
  return allowed.some((d) => hostname === d || hostname.endsWith("." + d));
}
function buildProviderHeaders(request, targetOrigin) {
  return {
    "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    // Tell the provider we arrived from their own site
    "Referer": targetOrigin + "/",
    "Origin": targetOrigin,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin"
  };
}
function buildResponseHeaders() {
  const h = new Headers();
  h.set("Content-Type", "text/html; charset=utf-8");
  h.set("Access-Control-Allow-Origin", "*");
  h.set("X-Content-Type-Options", "nosniff");
  return h;
}
async function getBlocklist(env) {
  try {
    const extra = await env.BLOCKLIST.get("domains");
    if (extra) {
      const extraDomains = JSON.parse(extra);
      return [.../* @__PURE__ */ new Set([...STATIC_BLOCKLIST, ...extraDomains])];
    }
  } catch {
  }
  return STATIC_BLOCKLIST;
}
function transformHtml(response, targetOrigin, blocklist) {
  const spoofFn = buildLocationSpoofScript();
  const rewriter = new HTMLRewriter().on("script[src]", {
    element(el) {
      const src = el.getAttribute("src") ?? "";
      if (blocklist.some((d) => src.includes(d))) el.remove();
    }
  }).on("iframe[src]", {
    element(el) {
      const src = el.getAttribute("src") ?? "";
      if (blocklist.some((d) => src.includes(d))) el.remove();
    }
  }).on("img[src]", {
    element(el) {
      const src = el.getAttribute("src") ?? "";
      if (blocklist.some((d) => src.includes(d))) el.remove();
    }
  }).on("link[href]", {
    element(el) {
      const href = el.getAttribute("href") ?? "";
      if (blocklist.some((d) => href.includes(d))) el.remove();
    }
  }).on("head", {
    element(el) {
      el.prepend(`<base href="${targetOrigin}/">`, { html: true });
      el.prepend(
        `<script>(${spoofFn})('${targetOrigin}')</script>`,
        { html: true }
      );
      el.append(`<style>${AD_HIDING_CSS}</style>`, { html: true });
    }
  });
  return rewriter.transform(
    new Response(response.body, {
      status: response.status,
      headers: buildResponseHeaders()
    })
  );
}
var index_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const reqUrl = new URL(request.url);
    const rawTarget = reqUrl.searchParams.get("url");
    if (!rawTarget) {
      return new Response("Missing required query parameter: ?url=", { status: 400 });
    }
    let targetUrl;
    try {
      targetUrl = new URL(rawTarget);
    } catch {
      return new Response("Invalid URL in ?url= parameter", { status: 400 });
    }
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response("Only http and https URLs are allowed", { status: 400 });
    }
    if (isPrivateHost(targetUrl.hostname)) {
      return new Response("Private/loopback addresses are not allowed", { status: 403 });
    }
    const allowedDomains = env.ALLOWED_DOMAINS ? env.ALLOWED_DOMAINS.split(",").map((d) => d.trim()).filter(Boolean) : [];
    if (!isAllowedDomain(targetUrl.hostname, allowedDomains)) {
      return new Response(
        `Domain not in allowlist: ${targetUrl.hostname}. Add it to ALLOWED_DOMAINS in the Worker environment.`,
        { status: 403 }
      );
    }
    let providerRes;
    try {
      providerRes = await fetch(rawTarget, {
        headers: buildProviderHeaders(request, targetUrl.origin),
        redirect: "follow"
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err}`, { status: 502 });
    }
    const finalOrigin = new URL(providerRes.url || rawTarget).origin;
    const contentType = providerRes.headers.get("Content-Type") ?? "";
    if (!contentType.includes("text/html")) {
      return new Response(providerRes.body, {
        status: providerRes.status,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
    const blocklist = await getBlocklist(env);
    return transformHtml(providerRes, finalOrigin, blocklist);
  }
};
export {
  index_default as default
};
