FROM nginx:latest AS ngi

RUN apt-get update  && apt-get -y install cron
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
    && apt-get install -y python3 pip $buildDeps $deps --no-install-recommends  && pip install -r /reqs.txt --break-system-packages
COPY front-update.py /
COPY mwcrontab /etc/cron.d/mwcrontab
RUN chmod 0644 /etc/cron.d/mwcrontab

RUN crontab /etc/cron.d/mwcrontab

COPY  /dist/mikrowizard /usr/share/nginx/html
COPY /nginx.conf  /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD cron;nginx -g "daemon off;"