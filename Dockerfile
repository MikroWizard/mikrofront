FROM nginx:latest AS ngi

RUN apt-get update && apt-get -y install cron openssl && \
    rm -rf /var/lib/apt/lists/*
RUN touch /var/log/cron.log
COPY reqs.txt /reqs.txt

RUN pip install -r /reqs.txt --break-system-packages
RUN pip install certbot --break-system-packages
COPY front-update.py /
COPY ssl-agent.py /
COPY mwcrontab /etc/cron.d/mwcrontab
RUN chmod 0644 /etc/cron.d/mwcrontab

RUN mkdir -p /conf/ssl/letsencrypt /conf/ssl/letsencrypt-work /conf/ssl/letsencrypt-logs /conf/ssl/manual

COPY  /dist/mikrowizard /usr/share/nginx/html
COPY /nginx.conf  /etc/nginx/conf.d/default.conf
RUN touch /conf/nginx-ssl-redirect.conf /conf/nginx-ssl-server.conf
EXPOSE 80 443
CMD cron; /usr/bin/python3 /ssl-agent.py & nginx -g "daemon off;"
