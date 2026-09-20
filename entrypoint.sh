#!/bin/sh
set -e

# Ensure required directories in /conf exist (in case /conf is mounted as an external volume)
mkdir -p /conf/logs
mkdir -p /conf/ssl/letsencrypt /conf/ssl/letsencrypt-work /conf/ssl/letsencrypt-logs /conf/ssl/manual

# Ensure SSL configuration files exist so nginx include directives don't fail
if [ ! -f /conf/nginx-ssl-redirect.conf ]; then
    echo "# SSL redirect disabled" > /conf/nginx-ssl-redirect.conf
fi

if [ ! -f /conf/nginx-ssl-server.conf ]; then
    echo "# SSL server disabled" > /conf/nginx-ssl-server.conf
fi

# Start cron daemon for background updates
cron

# Start ssl-agent in background
/usr/bin/python3 /ssl-agent.py &

# Execute main process (defaults to: nginx -g "daemon off;")
exec "$@"
