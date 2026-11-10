#!/bin/bash
# Shipped inside the front update zip; every updater (2.0 of old images, the later 2.0,
# the current 2.1) runs it after extracting. It does the install steps itself, because
# updater 2.0 aborts its own steps on old images (it runs "nginx" and "pkill" by name;
# cron's PATH has no /usr/sbin and the image has no procps) and then never gets here.
# So the package has no top-level nginx.conf / ssl-agent.py / html/version.json:
#   nginx/default.conf   installed here (nginx -t, reload, rollback on error)
#   ssl-agent/ssl-agent.py  installed here (updater 2.1 installs it itself first)
#   version.json         copied to html/version.json as the LAST step: until then the
#                        container still reports the old version, so an updater that
#                        aborted before this script retries the update.
# Must never fail the update: every step is optional.
# MW_FRONT_ROOT: test prefix for the container paths (empty in production).
# MW_NGINX: nginx binary (tests); default: nginx from PATH, else /usr/sbin/nginx.

ROOT="${MW_FRONT_ROOT:-}"
PKG_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX="${MW_NGINX:-$(command -v nginx 2>/dev/null || echo /usr/sbin/nginx)}"

# nginx.conf includes these; a missing file stops nginx from starting after a restart.
for f in "$ROOT/conf/nginx-ssl-redirect.conf" "$ROOT/conf/nginx-ssl-server.conf"; do
    if [ ! -f "$f" ]; then
        mkdir -p "$(dirname "$f")"
        echo "# SSL disabled" > "$f"
        echo "created $f"
    fi
done

# nginx config: backup, install, test, reload; roll back if the test fails.
NGINX_SRC="$PKG_DIR/nginx/default.conf"
NGINX_DST="$ROOT/etc/nginx/conf.d/default.conf"
if [ -f "$NGINX_SRC" ]; then
    mkdir -p "$(dirname "$NGINX_DST")"
    BAK="$ROOT/conf/nginx.conf.bak"
    [ -f "$NGINX_DST" ] && cp -f "$NGINX_DST" "$BAK"
    cp -f "$NGINX_SRC" "$NGINX_DST"
    if [ -x "$NGINX" ]; then
        if TEST_OUT="$("$NGINX" -t 2>&1)"; then
            "$NGINX" -s reload >/dev/null 2>&1
            echo "installed nginx config, reloaded"
        else
            echo "nginx config test FAILED: $TEST_OUT"
            if [ -f "$BAK" ]; then
                cp -f "$BAK" "$NGINX_DST"
                "$NGINX" -s reload >/dev/null 2>&1
                echo "rolled back nginx config"
            fi
        fi
    else
        echo "nginx binary not found ($NGINX): config installed, applies on the next nginx start"
    fi
    rm -rf "$PKG_DIR/nginx"
fi

# ssl-agent (SSL management): updater 2.1 installs ssl-agent/ssl-agent.py itself and
# removes the folder; for the older updaters it is installed and started here.
AGENT_SRC="$PKG_DIR/ssl-agent/ssl-agent.py"
if [ -f "$AGENT_SRC" ]; then
    cp -f "$AGENT_SRC" "$ROOT/ssl-agent.py" && chmod 755 "$ROOT/ssl-agent.py" && echo "installed ssl-agent.py"
    rm -rf "$PKG_DIR/ssl-agent"
    # stop a running agent without pkill (procps is not in the nginx image)
    for p in /proc/[0-9]*; do
        if tr '\0' ' ' < "$p/cmdline" 2>/dev/null | grep -q '/ssl-agent[.]py'; then
            kill "${p#/proc/}" 2>/dev/null && echo "stopped ssl-agent pid ${p#/proc/}"
        fi
    done
    sleep 1
    # the agent needs flask (older images do not have it)
    if ! /usr/bin/python3 -c 'import flask' 2>/dev/null; then
        /usr/bin/python3 -m pip install -q flask --break-system-packages >/dev/null 2>&1 \
            || /usr/bin/python3 -m pip install -q flask >/dev/null 2>&1
        /usr/bin/python3 -c 'import flask' 2>/dev/null && echo "installed flask" || echo "flask install failed"
    fi
    # fully detached: no pipe of the updater stays open, survives the updater's restart
    if command -v setsid >/dev/null 2>&1; then
        setsid nohup /usr/bin/python3 "$ROOT/ssl-agent.py" >/dev/null 2>&1 < /dev/null &
    else
        nohup /usr/bin/python3 "$ROOT/ssl-agent.py" >/dev/null 2>&1 < /dev/null &
    fi
    echo "started ssl-agent"
fi

# The updater must be scheduled exactly once. Some containers have it both in root's
# crontab and in /etc/cron.d/mwcrontab (with a user field), so cron starts two copies
# in the same second; the psutil check in old updaters then sees two and both exit
# with "Already running", every minute, forever. Keep only root's crontab.
if [ -z "$ROOT" ] && command -v crontab >/dev/null 2>&1; then
    CRON_LINE='* * * * * /usr/bin/python3 /front-update.py > /var/log/cron.log 2>&1'
    if ! crontab -l 2>/dev/null | grep -q '/front-update.py'; then
        (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
        echo "installed updater in root crontab"
    fi
    if [ -f /etc/cron.d/mwcrontab ]; then
        rm -f /etc/cron.d/mwcrontab
        echo "removed duplicate /etc/cron.d/mwcrontab"
    fi
fi

# Leftovers of earlier packages that make updater 2.0 abort on its next update: a top-level
# ssl-agent.py (left by 2.1.0 when updater 2.0 aborted) and a top-level nginx.conf.
rm -f "$PKG_DIR/ssl-agent.py" "$PKG_DIR/nginx.conf"

# Last step: report the new version. Everything above is done (or skipped) by now.
if [ -f "$PKG_DIR/version.json" ]; then
    mkdir -p "$PKG_DIR/html"
    cp -f "$PKG_DIR/version.json" "$PKG_DIR/html/version.json" && rm -f "$PKG_DIR/version.json" \
        && echo "version $(cat "$PKG_DIR/html/version.json")"
fi

exit 0
