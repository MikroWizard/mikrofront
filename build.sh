#!/bin/sh
# run in dev mode

npm run build --prod
python3 version_generate.py
sudo docker build --rm -t mikrofront .

