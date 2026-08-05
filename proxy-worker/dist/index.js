import { STATIC_BLOCKLIST } from './blocklist';
import { AD_HIDING_CSS } from './adCss';
import { buildLocationSpoofScript } from './locationSpoof';
// ─── Security helpers ─────────────────────────────────────────────────────────
// Covers IPv4 loopback/private ranges plus 169.254.0.0/16 — the link-local range
// that includes the cloud-metadata IP (169.254.169.254) most SSRF payloads target —
// and the IPv6 equivalents (::1, fe80::/10 link-local, fc00::/7 unique-local).
const PRIVATE_IP_RE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.|\[?(::1|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:))/i;
function isPrivateHost(hostname) {
    return PRIVATE_IP_RE.test(hostname);
}
function isAllowedDomain(hostname, allowed) {
    if (allowed.length === 0)
        return true; // allowlist disabled
    return allowed.some(d => hostname === d || hostname.endsWith('.' + d));
}
/**
 * True (with a reason) when `url` should be rejected — same checks the initial
 * request goes through. Re-run on every redirect hop below: `redirect: 'follow'`
 * would otherwise let an allowlisted origin 302 the fetch straight past the
 * private-IP/allowlist checks to an internal target.
 */
function rejectionReason(url, allowedDomains) {
    if (!['http:', 'https:'].includes(url.protocol))
        return 'disallowed protocol';
    if (isPrivateHost(url.hostname))
        return 'private/loopback address';
    if (!isAllowedDomain(url.hostname, allowedDomains))
        return `domain not in allowlist: ${url.hostname}`;
    return null;
}
const MAX_REDIRECTS = 5;
/**
 * Follows redirects manually (rather than `redirect: 'follow'`) so every hop —
 * not just the initial URL — is validated against the private-IP/allowlist checks.
 */
async function fetchValidated(initialUrl, headers, allowedDomains) {
    let current = initialUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const res = await fetch(current.toString(), { headers, redirect: 'manual' });
        if (res.status < 300 || res.status >= 400)
            return res;
        const location = res.headers.get('Location');
        if (!location)
            return res;
        const next = new URL(location, current);
        const reason = rejectionReason(next, allowedDomains);
        if (reason)
            throw new Error(`Blocked redirect to ${next.hostname}: ${reason}`);
        current = next;
    }
    throw new Error('Too many redirects');
}
// ─── Header helpers ───────────────────────────────────────────────────────────
function buildProviderHeaders(request, targetOrigin) {
    return {
        'User-Agent': request.headers.get('User-Agent')
            || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Tell the provider we arrived from their own site
        'Referer': targetOrigin + '/',
        'Origin': targetOrigin,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
    };
}
function buildResponseHeaders() {
    const h = new Headers();
    h.set('Content-Type', 'text/html; charset=utf-8');
    // Allow the main app to embed this in an iframe
    h.set('Access-Control-Allow-Origin', '*');
    h.set('X-Content-Type-Options', 'nosniff');
    // Do NOT send X-Frame-Options or CSP frame-ancestors — we want iframing to work
    return h;
}
// ─── Blocklist loader ─────────────────────────────────────────────────────────
async function getBlocklist(env) {
    try {
        const extra = await env.BLOCKLIST.get('domains');
        if (extra) {
            const extraDomains = JSON.parse(extra);
            return [...new Set([...STATIC_BLOCKLIST, ...extraDomains])];
        }
    }
    catch {
        // KV unavailable or malformed JSON — fall through to static list
    }
    return STATIC_BLOCKLIST;
}
// ─── HTML transformer ─────────────────────────────────────────────────────────
function transformHtml(response, targetOrigin, blocklist) {
    const spoofFn = buildLocationSpoofScript();
    const rewriter = new HTMLRewriter()
        // ── Strip external ad scripts ───────────────────────────────────────────
        .on('script[src]', {
        element(el) {
            const src = el.getAttribute('src') ?? '';
            if (blocklist.some(d => src.includes(d)))
                el.remove();
        },
    })
        // ── Strip ad iframes ────────────────────────────────────────────────────
        .on('iframe[src]', {
        element(el) {
            const src = el.getAttribute('src') ?? '';
            if (blocklist.some(d => src.includes(d)))
                el.remove();
        },
    })
        // ── Strip ad tracking pixels ────────────────────────────────────────────
        .on('img[src]', {
        element(el) {
            const src = el.getAttribute('src') ?? '';
            if (blocklist.some(d => src.includes(d)))
                el.remove();
        },
    })
        // ── Strip ad preload / stylesheet links ─────────────────────────────────
        .on('link[href]', {
        element(el) {
            const href = el.getAttribute('href') ?? '';
            if (blocklist.some(d => href.includes(d)))
                el.remove();
        },
    })
        // ── Inject into <head>: base tag + spoof script + ad-hiding CSS ─────────
        .on('head', {
        element(el) {
            // <base> must come first so subsequent relative URL resolution uses it
            el.prepend(`<base href="${targetOrigin}/">`, { html: true });
            // Spoof runs before any provider scripts
            el.prepend(`<script>(${spoofFn})('${targetOrigin}')</script>`, { html: true });
            // CSS at end of <head> so it overrides provider styles
            el.append(`<style>${AD_HIDING_CSS}</style>`, { html: true });
        },
    });
    return rewriter.transform(new Response(response.body, {
        status: response.status,
        headers: buildResponseHeaders(),
    }));
}
// ─── Main fetch handler ───────────────────────────────────────────────────────
const worker = {
    async fetch(request, env) {
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }
        if (request.method !== 'GET') {
            return new Response('Method Not Allowed', { status: 405 });
        }
        // ── Parse & validate target URL ─────────────────────────────────────────
        const reqUrl = new URL(request.url);
        const rawTarget = reqUrl.searchParams.get('url');
        if (!rawTarget) {
            return new Response('Missing required query parameter: ?url=', { status: 400 });
        }
        let targetUrl;
        try {
            targetUrl = new URL(rawTarget);
        }
        catch {
            return new Response('Invalid URL in ?url= parameter', { status: 400 });
        }
        const allowedDomains = env.ALLOWED_DOMAINS
            ? env.ALLOWED_DOMAINS.split(',').map(d => d.trim()).filter(Boolean)
            : [];
        const reason = rejectionReason(targetUrl, allowedDomains);
        if (reason) {
            return new Response(`Request blocked: ${reason}. If this domain should be allowed, add it to ALLOWED_DOMAINS in the Worker environment.`, { status: 403 });
        }
        // ── Fetch provider page, re-validating every redirect hop ────────────────
        let providerRes;
        try {
            providerRes = await fetchValidated(targetUrl, buildProviderHeaders(request, targetUrl.origin), allowedDomains);
        }
        catch (err) {
            return new Response(`Upstream fetch failed: ${err}`, { status: 502 });
        }
        // Use the URL after any redirects as the base for relative URL resolution
        const finalOrigin = new URL(providerRes.url || rawTarget).origin;
        const contentType = providerRes.headers.get('Content-Type') ?? '';
        // ── Pass non-HTML responses through unchanged ───────────────────────────
        if (!contentType.includes('text/html')) {
            return new Response(providerRes.body, {
                status: providerRes.status,
                headers: { 'Access-Control-Allow-Origin': '*' },
            });
        }
        // ── Transform HTML ──────────────────────────────────────────────────────
        const blocklist = await getBlocklist(env);
        return transformHtml(providerRes, finalOrigin, blocklist);
    },
};
export default worker;
