// Service worker minimal — coquille hors-ligne (§5.4).
// Stratégie : network-first pour la navigation, cache en secours pour les assets.
// Les données métier (ventes, stock) passent par IndexedDB + file de sync,
// pas par ce cache.
//
// Règle d'or (correctif 2026-10-06) : `respondWith` doit TOUJOURS recevoir une
// Response. Un `caches.match()` sans résultat renvoie `undefined` → le navigateur
// lève « Failed to convert value to 'Response' » et la page (/pos) tombe en erreur
// réseau dès que l'API ou le réseau hoquette. On retombe donc sur la page en cache,
// puis sur l'accueil, puis sur une page « hors ligne » explicite.
const CACHE = 'wilinwi-shell-v2';

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Wilinwi — hors ligne</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f6f8fc;color:#0f172a}
main{max-width:22rem;padding:2rem;text-align:center}h1{font-size:1.15rem;color:#001d5a}p{color:#64748b;font-size:.9rem}
button{margin-top:1rem;background:#0005ea;color:#fff;border:0;border-radius:.75rem;padding:.7rem 1.4rem;font-weight:700;cursor:pointer}</style></head>
<body><main><h1>Connexion momentanément indisponible</h1>
<p>Wilinwi n'arrive pas à joindre le serveur. Vérifiez votre connexion internet puis réessayez.</p>
<button onclick="location.reload()">Réessayer</button></main></body></html>`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

/** Secours hors-ligne : version en cache, sinon accueil (navigation), sinon réponse explicite. */
async function fallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  if (request.mode === 'navigate') {
    const shell = await caches.match('/');
    if (shell) return shell;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        // On ne met en cache que les réponses valides (jamais une 404/500).
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => fallback(request)),
  );
});
