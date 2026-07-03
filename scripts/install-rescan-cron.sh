#!/bin/bash
# Installe sur le VPS (srv1326181) le déclencheur quotidien du re-scan
# SparkGrowth : cron 10h00 UTC (= 6h00 Guadeloupe).
#
# Logique v2 (l'hébergeur coupe les fonctions à 300s, un scan peut durer plus) :
#   1. Appel du déclencheur → lance le scan en arrière-plan (202 + scan_id)
#   2. Toutes les 60s : appel du rapport → quand le scan est fini, le serveur
#      envoie l'email récap (deltas vs scan précédent) et répond ready:true.
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

echo "2/3 Installation sur le VPS (fichier env 600 + script v2 + cron 10h UTC)…"
ssh "$VPS" bash -s <<REMOTE
set -euo pipefail
umask 077
mkdir -p /root/.config
printf 'CRON_SECRET=%s\n' '$SECRET' > /root/.config/sparkgrowth-rescan.env
cat > /root/sparkgrowth-rescan.sh <<'SCRIPT'
#!/bin/bash
# Re-scan quotidien SparkGrowth : déclenche, puis attend la fin pour que
# le serveur envoie l'email récap. Ne re-scanne que si >= 7 jours.
. /root/.config/sparkgrowth-rescan.env
BASE="$URL"
LOG=/root/sparkgrowth-rescan.log
echo "--- \$(date -u '+%F %T') UTC" >> \$LOG
R=\$(curl -s -m 120 -H "x-cron-secret: \$CRON_SECRET" "\$BASE")
echo "\$R" >> \$LOG
NEXT=\$(echo "\$R" | grep -o '"next":"[^"]*"' | cut -d'"' -f4)
if [ -z "\$NEXT" ]; then echo "(rien à re-scanner)" >> \$LOG; exit 0; fi
for i in \$(seq 1 20); do
  sleep 60
  S=\$(curl -s -m 120 -H "x-cron-secret: \$CRON_SECRET" "\$BASE\$NEXT")
  echo "\$S" >> \$LOG
  if echo "\$S" | grep -q '"ready":true'; then exit 0; fi
done
echo "TIMEOUT après 20 min" >> \$LOG
SCRIPT
chmod 700 /root/sparkgrowth-rescan.sh
( crontab -l 2>/dev/null | grep -v sparkgrowth-rescan ; echo '0 10 * * * /root/sparkgrowth-rescan.sh' ) | crontab -
echo "Cron installé :"
crontab -l | grep sparkgrowth-rescan
REMOTE

echo "3/3 OK. Test manuel possible : ssh $VPS /root/sparkgrowth-rescan.sh puis tail /root/sparkgrowth-rescan.log"
echo "Terminé."
