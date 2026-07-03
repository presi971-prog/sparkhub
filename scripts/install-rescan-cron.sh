#!/bin/bash
# Installe sur le VPS (srv1326181) le déclencheur quotidien du re-scan
# SparkGrowth : cron 10h00 UTC (= 6h00 Guadeloupe).
#
# Logique v3 (l'hébergeur coupe les fonctions à ~5 min, or un scan peut être
# lent quand les API externes rament) :
#   - jusqu'à 3 rounds : déclencher le scan → poller ?report= toutes les 20s.
#   - le serveur nettoie lui-même les scans morts (janitor > 30 min) et le
#     rapport passe alors en status:error → on relance un round.
#   - dès ready:true, le serveur a envoyé l'email récap : terminé.
#
# Usage (depuis le Mac) : bash scripts/install-rescan-cron.sh
set -euo pipefail

cd "$(dirname "$0")/.."

VPS=root@69.62.97.3
URL="https://sparkgrowth.digital-code-growth.com/api/sparkscan/rescan-weekly"

echo "1/2 Récupération du CRON_SECRET (scope Production Vercel)…"
npx vercel env pull /tmp/p.tmp --environment=production --scope thierrys-projects-e56377fe >/dev/null
SECRET=$(grep '^CRON_SECRET=' /tmp/p.tmp | cut -d= -f2- | tr -d '"')
rm -f /tmp/p.tmp
[ -n "$SECRET" ] || { echo "CRON_SECRET introuvable"; exit 1; }

echo "2/2 Installation sur le VPS (fichier env 600 + script v3 + cron 10h UTC)…"
ssh "$VPS" bash -s <<REMOTE
set -euo pipefail
umask 077
mkdir -p /root/.config
printf 'CRON_SECRET=%s\n' '$SECRET' > /root/.config/sparkgrowth-rescan.env
cat > /root/sparkgrowth-rescan.sh <<'SCRIPT'
#!/bin/bash
# Re-scan quotidien SparkGrowth (v3) : déclenche, surveille, relance si mort.
. /root/.config/sparkgrowth-rescan.env
BASE="$URL"
LOG=/root/sparkgrowth-rescan.log
echo "--- \$(date -u '+%F %T') UTC" >> \$LOG
for round in 1 2 3; do
  R=\$(curl -s -m 120 -H "x-cron-secret: \$CRON_SECRET" "\$BASE")
  echo "round \$round trigger: \$R" >> \$LOG
  NEXT=\$(echo "\$R" | grep -o '"next":"[^"]*"' | cut -d'"' -f4)
  if [ -z "\$NEXT" ]; then echo "(rien à re-scanner)" >> \$LOG; exit 0; fi
  # 120 polls x 20s = 40 min max par round
  for i in \$(seq 1 120); do
    sleep 20
    S=\$(curl -s -m 60 -H "x-cron-secret: \$CRON_SECRET" "\$BASE\$NEXT")
    if echo "\$S" | grep -q '"ready":true'; then
      echo "round \$round result: \$S" >> \$LOG
      echo "\$S" | grep -q '"status":"error"' && break
      exit 0
    fi
  done
  echo "round \$round: scan mort ou trop long, relance" >> \$LOG
done
echo "ECHEC après 3 rounds" >> \$LOG
SCRIPT
chmod 700 /root/sparkgrowth-rescan.sh
( crontab -l 2>/dev/null | grep -v sparkgrowth-rescan ; echo '0 10 * * * /root/sparkgrowth-rescan.sh' ) | crontab -
echo "Cron installé :"
crontab -l | grep sparkgrowth-rescan
REMOTE

echo "Terminé."
