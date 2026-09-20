FROM nginx:latest AS ngi

RUN apt-get update && apt-get -y install cron openssl
RUN touch /var/log/cron.log
COPY reqs.txt /reqs.txt
RUN set -ex \
    && buildDeps=' \
        build-essential \
        gcc \
    ' \
    && deps=' \
        htop \
    ' \
    && apt-get install -y python3 python3-dev pip $buildDeps $deps --no-install-recommends  && pip install -r /reqs.txt --break-system-packages
RUN pip install certbot --break-system-packages
COPY front-update.py /
COPY ssl-agent.py /
COPY mwcrontab /etc/cron.d/mwcrontab
RUN chmod 0644 /etc/cron.d/mwcrontab
RUN crontab /etc/cron.d/mwcrontab
RUN mkdir -p /conf/ssl/letsencrypt /conf/ssl/letsencrypt-work /conf/ssl/letsencrypt-logs /conf/ssl/manual

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY  /dist/mikrowizard /usr/share/nginx/html
COPY /nginx.conf  /etc/nginx/conf.d/default.conf
RUN touch /conf/nginx-ssl-redirect.conf /conf/nginx-ssl-server.conf
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
