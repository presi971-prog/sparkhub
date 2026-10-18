// copie de analyze/route.ts, garder synchronisé
export function sanitizeTargetUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    throw new Error('URL invalide')
  }
  const proto = parsed.protocol.replace(':', '').toLowerCase()
  if (proto !== 'http' && proto !== 'https') {
    throw new Error(`Protocole non autorisé : ${proto}`)
  }
  const hostname = parsed.hostname.toLowerCase()
  // Hostnames bloqués (localhost, loopback, broadcast)
  if (
    hostname === 'localhost' ||
    hostname === 'broadcasthost' ||
    hostname === '0.0.0.0' ||
    hostname === '255.255.255.255'
  ) {
    throw new Error(`URL pointant vers une cible interne : ${hostname}`)
  }
  // Bloque IP privées + metadata cloud
  // - 10.0.0.0/8         (privé classe A)
  // - 172.16.0.0/12      (privé classe B — simplifié : on bloque 172.16-31)
  // - 192.168.0.0/16     (privé classe C)
  // - 127.0.0.0/8        (loopback)
  // - 169.254.0.0/16     (link-local, AWS/GCP metadata 169.254.169.254)
  // - ::1, fc00::/7, fe80::/10 (IPv6 privées et loopback)
  if (/^127\./.test(hostname)) throw new Error(`URL loopback : ${hostname}`)
  if (/^10\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^192\.168\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^169\.254\./.test(hostname)) throw new Error(`URL metadata cloud : ${hostname}`)
  if (hostname === '::1') throw new Error(`URL loopback IPv6`)
  if (/^fc[0-9a-f]{2}:/i.test(hostname)) throw new Error(`URL IPv6 privée`)
  if (/^fe[89ab][0-9a-f]:/i.test(hostname)) throw new Error(`URL IPv6 link-local`)
  // Hostname trop court (genre "a") = suspect
  if (hostname.length < 4 || !hostname.includes('.')) {
    throw new Error('Domaine invalide (trop court ou sans TLD)')
  }
  return parsed.toString()
}
