/**
 * Comprehensive ad/tracker domain blocklist for the CineStream proxy Worker.
 *
 * Domains here are matched as substrings of script/iframe/img/link src attributes.
 * Update the KV namespace (PROXY_BLOCKLIST → key "domains") with a JSON array
 * to extend or override this list at runtime without redeploying.
 */
export const STATIC_BLOCKLIST: string[] = [
  // ── Google Ads / Analytics ───────────────────────────────────────────────
  'doubleclick.net',
  'googlesyndication.com',
  'googletagmanager.com',
  'googletagservices.com',
  'google-analytics.com',
  'adservice.google.com',
  'imasdk.googleapis.com',
  'securepubads.g.doubleclick.net',

  // ── Major Programmatic Ad Networks ───────────────────────────────────────
  'adnxs.com',           // AppNexus / Xandr
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'adsrvr.org',          // The Trade Desk
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'sharethrough.com',
  'triplelift.com',
  '33across.com',
  'smartadserver.com',
  'lijit.com',           // Sovrn
  'sovrn.com',
  'advertising.com',
  'yieldmo.com',
  'indexexchange.com',
  'casalemedia.com',     // Index Exchange
  'contextweb.com',      // PulsePoint
  'conversantmedia.com',
  'amazon-adsystem.com',
  'adtechus.com',
  'bidswitch.net',
  'lkqd.net',
  'moatads.com',
  'adsafeprotected.com', // IAS
  'sizmek.com',
  'flashtalking.com',
  'appnexus.com',
  'yldbt.com',           // Yieldbird
  'mediamath.com',
  'lotame.com',
  'rlcdn.com',           // Rocketship
  'rfihub.com',
  'demdex.net',          // Adobe Audience Manager
  'everesttech.net',     // Adobe Ad Cloud
  'adobedtm.com',

  // ── Pop-under / Redirect Networks (common on streaming sites) ────────────
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'adcash.com',
  'exoclick.com',
  'trafficjunky.net',
  'juicyads.com',
  'hilltopads.net',
  'plugrush.com',
  'push.house',
  'admaven.com',
  'zeropark.com',
  'richpush.co',
  'evadav.com',
  'adsterra.com',
  'clickadu.com',
  'adskeeper.co.uk',
  'pushground.com',
  'dads.io',
  'megapush.net',
  'pushpush.net',
  'alfasubs.com',
  'goldads.net',
  'onclicka.com',
  'onclickads.net',
  'onclick.io',
  'clickain.com',
  'popunder.net',
  'rockyou.com',

  // ── Tracking / Data Brokers ───────────────────────────────────────────────
  'scorecardresearch.com',
  'quantserve.com',
  'bluekai.com',
  'krxd.net',            // Krux / Salesforce DMP
  'addthis.com',
  'sharethis.com',
  'chartbeat.com',
  'parsely.com',
  'comscore.com',
  'nielsen.com',
  'omtrdc.net',          // Adobe Analytics
  'mxpnl.com',           // Mixpanel
  'segment.com',
  'segment.io',
  'heapanalytics.com',
  'mouseflow.com',
  'hotjar.com',
  'fullstory.com',
  'logrocket.com',
  'crazyegg.com',

  // ── Coin-miners & Malvertising ────────────────────────────────────────────
  'coinhive.com',
  'coin-hive.com',
  'crypto-loot.com',
  'minero.cc',
  'jsecoin.com',
  'miner.pr0gramm.com',
  'ppoi.org',
]
