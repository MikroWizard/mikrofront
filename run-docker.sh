sudo docker run --rm -it --add-host=host.docker.internal:host-gateway --name mikrofront-dev --add-host=host.docker.internal:host-gateway -p 80:80 -v /opt/mikrowizard/:/conf/  mikrofront
