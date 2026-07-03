#!/bin/bash
# Installe sur le VPS (srv1326181) le déclencheur quotidien du re-scan
# SparkGrowth : cron 10h00 UTC (= 6h00 Guadeloupe) qui appelle
# /api/sparkscan/rescan-weekly sur le domaine live, avec le CRON_SECRET.
# Lance aussi UN premier re-scan immédiat pour valider toute la chaîne
# (scan → positions mots-clés → email récap).
#
# Usage (depuis le Mac) : bash scripts/install-rescan-cron.sh
set -euo pipefail

cd "$(dirname "$0")/.."

VPS=root@69.62.97.3
URL="https://sparkgrowth.digital-code-growth.com/api/sparkscan/rescan-weekly"

echo "1/3 Récupération du CRON_SECRET (scope Production Vercel)…"
npx vercel env pull /tmp/p.tmp --environment=production --scope thierrys-projects-e56377fe >/dev/null
SECRET=$(grep '^CRON_SECRET=' /tmp/p.tmp | cut -d= -f2- | tr -d '"')
rm -f /tmp/p.tmp
[ -n "$SECRET" ] || { echo "CRON_SECRET introuvable"; exit 1; }

echo "2/3 Installation sur le VPS (fichier env 600 + script + cron 10h UTC)…"
ssh "$VPS" bash -s <<REMOTE
set -euo pipefail
umask 077
mkdir -p /root/.config
printf 'CRON_SECRET=%s\n' '$SECRET' > /root/.config/sparkgrowth-rescan.env
cat > /root/sparkgrowth-rescan.sh <<'SCRIPT'
#!/bin/bash
# Re-scan quotidien SparkGrowth (ne re-scanne un site que si >= 7 jours)
. /root/.config/sparkgrowth-rescan.env
echo "--- \$(date -u '+%F %T') UTC" >> /root/sparkgrowth-rescan.log
curl -s -m 600 -H "x-cron-secret: \$CRON_SECRET" "$URL" >> /root/sparkgrowth-rescan.log 2>&1
echo >> /root/sparkgrowth-rescan.log
SCRIPT
chmod 700 /root/sparkgrowth-rescan.sh
( crontab -l 2>/dev/null | grep -v sparkgrowth-rescan ; echo '0 10 * * * /root/sparkgrowth-rescan.sh' ) | crontab -
echo "Cron installé :"
crontab -l | grep sparkgrowth-rescan
REMOTE

echo "3/3 Premier re-scan réel lancé maintenant (3 à 6 min, ~0,15 \$)…"
ssh "$VPS" 'nohup /root/sparkgrowth-rescan.sh >/dev/null 2>&1 & echo "Lancé en arrière-plan. Suivi : ssh root@69.62.97.3 tail -f /root/sparkgrowth-rescan.log"'

echo "Terminé. Tu recevras l'email récap sur l'adresse de ton compte SparkHub quand le scan sera fini."
