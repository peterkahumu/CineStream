/**
 * CSS injected into every proxied provider page.
 *
 * Targets common ad container class/ID patterns used by streaming site ad SDKs.
 * These rules run after the page renders, catching anything not stripped at the
 * HTML level (e.g. dynamically inserted banners).
 */
export const AD_HIDING_CSS = `
/* ── Generic ad container patterns ─────────────────────────────── */
[class*="ad-wrap"], [class*="ad-container"], [class*="adcontainer"],
[class*="ad-banner"], [class*="ad-slot"], [class*="ad-unit"],
[class*="advertisement"], [class*="ads-container"], [class*="ads-wrap"],
[id*="ad-container"], [id*="ad-wrapper"], [id*="adcontainer"],
[id*="ad_container"], [id*="banner-ad"], [id*="ad-banner"],
[id*="ad-slot"], [id*="ad-unit"],

/* ── ExoClick ───────────────────────────────────────────────────── */
[id^="exo-"], .exo-ad, [class*="exoClick"],

/* ── PropellerAds ───────────────────────────────────────────────── */
[id^="propeller-"], [class*="propeller-ad"],

/* ── PopAds / onclick overlays ─────────────────────────────────── */
[id*="pop_"], [id*="overlay_ad"], [class*="overlay-ad"],

/* ── Floating / sticky banners ──────────────────────────────────── */
[class*="sticky-ad"], [class*="floating-ad"], [class*="fixed-ad"],
[class*="bottom-ad"], [class*="top-ad"],

/* ── Player overlay ads ─────────────────────────────────────────── */
[class*="player-ad"], [class*="preroll"], [class*="midroll"],
[class*="video-ad"], [id*="video-ad"], [id*="player-ad"],

/* ── Push notification prompts ──────────────────────────────────── */
[class*="push-notification"], [class*="push-prompt"],
[id*="push-notification"], [id*="push-prompt"],

/* ── Popup / interstitial overlays ─────────────────────────────── */
[class*="popup-ad"], [class*="interstitial"], [class*="modal-ad"],
[class*="lightbox-ad"],

/* ── Native ad widgets (Taboola / Outbrain / RevContent) ───────── */
[class*="taboola"], [id*="taboola"], [class*="outbrain"], [id*="outbrain"],
[class*="revcontent"], [id*="revcontent"],
[class*="mgid"], [id*="mgid"],

/* ── Adsterra ───────────────────────────────────────────────────── */
[class*="adsterra"], [id*="adsterra"],

/* ── Generic iframe-based ad holders ───────────────────────────── */
iframe[id*="google_ads"], iframe[name*="google_ads"],
iframe[id*="aswift"], iframe[id*="adfox"],

/* ── Suppress hidden countdown overlays used by pop-unders ─────── */
[id*="countdown"], [class*="countdown-overlay"], [class*="skip-ad"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
}

/* ── Prevent page-level blur / freeze tricks used during redirects */
body { pointer-events: auto !important; filter: none !important; }
`;
