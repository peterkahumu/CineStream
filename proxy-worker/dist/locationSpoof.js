/**
 * Returns a serialised IIFE string that is injected into the <head> of every
 * proxied page. It is called immediately with the provider's origin so that
 * window.location, document.referrer, and window.open are spoofed/patched
 * before any provider scripts execute.
 *
 * Usage in HTMLRewriter:
 *   el.prepend(`<script>(${buildLocationSpoofScript()})('https://provider.com')</script>`, { html: true })
 */
export function buildLocationSpoofScript() {
    // Written as a plain function string so it can be serialised and injected.
    // Must NOT reference any TypeScript-only constructs — this runs in the browser.
    return /* js */ `function(targetOrigin) {
  try {
    var targetUrl = new URL(targetOrigin);

    /* ── Block new-window popups (pop-unders) ─────────────────────── */
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

    /* ── Suppress alert/confirm spam ─────────────────────────────── */
    window.alert   = function() {};
    window.confirm = function() { return false; };
    // Keep prompt — some players use it for password/PIN entry

    /* ── Block top-level navigation redirects ─────────────────────── */
    var _assign   = window.location.assign.bind(window.location);
    var _replace  = window.location.replace.bind(window.location);
    Object.defineProperty(window, '_realAssign',  { value: _assign,  writable: false });
    Object.defineProperty(window, '_realReplace', { value: _replace, writable: false });

    /* ── Spoof window.location ────────────────────────────────────── */
    var locationProxy = new Proxy(window.location, {
      get: function(target, prop) {
        if (prop === 'hostname') return targetUrl.hostname;
        if (prop === 'host')     return targetUrl.host;
        if (prop === 'origin')   return targetOrigin;
        if (prop === 'protocol') return targetUrl.protocol;
        if (prop === 'href')     return target.href.replace(window.location.origin, targetOrigin);
        // Passthrough for everything else (pathname, search, hash, assign, replace…)
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

    /* ── Spoof document.referrer ──────────────────────────────────── */
    try {
      Object.defineProperty(document, 'referrer', {
        get: function() { return targetOrigin + '/'; },
        configurable: true
      });
    } catch(_) {}

    /* ── Try document.domain (may throw in strict mode) ───────────── */
    try { document.domain = targetUrl.hostname; } catch(_) {}

  } catch(e) {
    // Silently degrade — some hardened environments block defineProperty on window
  }
}`;
}
