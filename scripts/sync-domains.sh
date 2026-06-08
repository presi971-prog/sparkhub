#!/bin/bash
# Synchronise les adresses SparkGrowth sur le DERNIER déploiement.
# Patient : réessaie jusqu'à ce que le déploiement soit PRÊT (aliasing OK).
# À lancer après chaque amélioration → l'adresse sert toujours la version à jour.
# Usage : bash scripts/sync-domains.sh

DOMAINS="sparkgrowth.digital-code-growth.com decouvrir.digital-code-growth.com sparkgrowth-dcg.vercel.app"

LATEST=$(npx --yes vercel ls sparkhub 2>/dev/null \
  | grep -oE "https://sparkhub-[a-z0-9]+-thierrys-projects-e56377fe\.vercel\.app" | head -1)
if [ -z "$LATEST" ]; then echo "❌ Aucun déploiement trouvé."; exit 1; fi
echo "Dernier déploiement : $LATEST"

# Réessaie l'aliasing jusqu'à 8 fois (le build peut ne pas être encore Ready).
for attempt in $(seq 1 8); do
  res=$(npx --yes vercel alias set "$LATEST" sparkgrowth.digital-code-growth.com 2>&1)
  if echo "$res" | grep -qi "Success"; then
    for d in $DOMAINS; do
      printf "  %-42s " "$d"
      npx --yes vercel alias set "$LATEST" "$d" 2>&1 | grep -oiE "Success|Error" | head -1
    done
    echo "✅ Adresses synchronisées sur la dernière version."
    exit 0
  fi
  echo "  build pas encore prêt (essai $attempt/8)… nouvelle tentative dans 25s"
  sleep 25
done
echo "⚠️ Toujours pas prêt après ~3,5 min. Relance : bash scripts/sync-domains.sh"
exit 1
