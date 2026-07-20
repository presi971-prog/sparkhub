// Smart Crawler — Signature navigateur partagée
//
// Jina Reader (r.jina.ai) est derrière Cloudflare : sans User-Agent de
// navigateur, Cloudflare renvoie 403 "browser_signature_banned" (constaté en
// prod le 19/07/2026). On centralise ici la signature pour que tous les
// fetchs sortants (Jina, HTML brut) présentent le même profil Chrome desktop.

/** User-Agent Chrome desktop récent — NE PAS supprimer, requis par Cloudflare. */
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
