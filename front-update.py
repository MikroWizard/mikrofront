#!/usr/bin/python
# -*- coding: utf-8 -*-

# mule1.py: independent worker process
#   - a TCP server as an example

import time
import datetime
from pathlib import Path
import requests
import logging
import os
import hashlib
import zipfile
import subprocess
import json
import shutil
from cryptography.fernet import Fernet 
import psutil
import sys
logging.basicConfig(level=logging.INFO)



log = logging.getLogger("updater")
log.setLevel(logging.INFO)
API_URL="http://host.docker.internal:8181"
Config_File="/conf/server-conf.json"
Version_File="/usr/share/nginx/html/version.json"
SCRIPT_VERSION="2.0"
# Example usage
def check_sha256(filename, expect):
    """Check if the file with the name "filename" matches the SHA-256 sum
    in "expect"."""
    h = hashlib.sha256()
    # This will raise an exception if the file doesn't exist. Catching
    # and handling it is left as an exercise for the reader.
    try:
        with open(filename, 'rb') as fh:
            # Read and hash the file in 4K chunks. Reading the whole
            # file at once might consume a lot of memory if it is
            # large.
            while True:
                data = fh.read(4096)
                if len(data) == 0:
                    break
                else:
                    h.update(data)
        return expect == h.hexdigest()
    except Exception as e:
        return False

def crypt_data(text,key):
    # Encryption: Encrypting password using Fernet symmetric encryption 
    key = Fernet.generate_key() 
    cipher_suite = Fernet(key) 
    # Encrypting  
    encrypted_password = cipher_suite.encrypt(text.encode()).decode() 
    return encrypted_password
     

def decrypt_data(text,key):
    # Encryption: Decrypting password using Fernet symmetric encryption 
    cipher_suite = Fernet(key) 
    # Decrypting password 
    decrypted_password = cipher_suite.decrypt(text.encode()).decode()
    return decrypted_password

def extract_zip_reload(filename,dst):
    """Extract the contents of the zip file "filename" to the directory
    "dst". Then reload the updated modules."""
    with zipfile.ZipFile(filename, 'r') as zip_ref:
        zip_ref.extractall(dst)
    
    # Check for nginx.conf update
    nginx_conf_src = os.path.join(dst, "nginx.conf")
    if os.path.exists(nginx_conf_src):
        log.info("Updating nginx.conf and reloading nginx...")
        shutil.move(nginx_conf_src, "/etc/nginx/conf.d/default.conf")
        subprocess.run(["nginx", "-s", "reload"], check=False)
        
    # Optional post-update script for future flexibility
    post_update_src = os.path.join(dst, "post_update.sh")
    if os.path.exists(post_update_src):
        log.info("Running post_update.sh...")
        subprocess.run(["bash", post_update_src], check=False)
        if os.path.exists(post_update_src):
            os.remove(post_update_src)
        
    # Check for front-update.py update
    front_update_src = os.path.join(dst, "front-update.py")
    should_restart = False
    if os.path.exists(front_update_src):
        log.info("Updating front-update.py...")
        shutil.move(front_update_src, "/front-update.py")
        os.chmod("/front-update.py", 0o755)
        should_restart = True

    os.remove(filename)

    if should_restart:
        log.info("Restarting updater process...")
        sys.exit(0)

def load_config_file():
    try:
        with open(Config_File, 'r') as fh:
            config = json.load(fh)
            return config
    except Exception as e:
        log.error(e)
        return False

def get_serial_from_api():
    url=API_URL+"/api/get_version"
    config=load_config_file()
    key=False
    if config:
        key=config.get('PYSRV_CRYPT_KEY',False)
    else:
        return False
    if not key:
        return False
    try:
        response = requests.get(url)
        response = response.json()
        return json.loads(decrypt_data(response['result'],key))
    except  Exception as e:
        log.error(e)
        return False


def get_version_from_file():
    try:
        with open(Version_File, 'r') as fh:
            version = json.load(fh)
            return version.get('version', '0.0.0')
    except Exception as e:
        log.error(e)
        return '0.0.0'
 

def main():
    while True:
        pcount=0
        for process in psutil.process_iter():
            if '/front-update.py' in process.cmdline():
                pcount=pcount+1
        if pcount>=2:
            print("Already running")
            exit()
        try:
            next_hour = (time.time() // 3600 + 1) * 3600
            sleep_time = next_hour - time.time()

            res=get_serial_from_api()
            hwid=res['serial']
            username=res['username']
            version=get_version_from_file()

            params={
                "serial_number": hwid,
                "username": username.strip(),
                "front":True,
                "version": version,
                "script_version": SCRIPT_VERSION
            }
            url="https://mikrowizard.com/wp-json/mikrowizard/v1/get_update"
            # send post request to server mikrowizard.com with params in json
            response = requests.post(url, json=params)
            # get response from server
            res = response
            try:
                if res.status_code == 200:
                    res=res.json()
                if 'token' in res:
                    params={
                    "token":res['token'],
                    "file_name":res['filename'],
                    "username":username.strip(),
                    "front":True
                    }
                    log.info("Update available/Downloading...")
                else:
                    log.info("Update not available")
                    time.sleep(sleep_time)
                    continue
            except Exception as e:
                log.error(e)
            
            # check if  filename exist in /app/py and checksum is same then dont continue
            if check_sha256("/usr/share/nginx/"+res['filename'], res['sha256']):
                log.error("Checksum match, File exist")
                extract_zip_reload("/usr/share/nginx/"+res['filename'],"/usr/share/nginx/")
                time.sleep(sleep_time)
                continue
            download_url="https://mikrowizard.com/wp-json/mikrowizard/v1/download_update"
            # send post request to server mikrowizard.com with params in json
            r = requests.post(download_url,json=params,stream=True)
            if "invalid" in r.text or r.text=='false':
                log.error(r)
                log.error("Invalid response")
                time.sleep(30)
                continue
            with open("/usr/share/nginx/"+res['filename'], 'wb') as fd:
                for chunk in r.iter_content(chunk_size=128):
                    fd.write(chunk)
            if check_sha256("/usr/share/nginx/"+res['filename'], res['sha256']):
                log.error("Update downloaded")
                log.error("/usr/share/nginx/"+res['filename'])
                extract_zip_reload("/usr/share/nginx/"+res['filename'],"/usr/share/nginx/")
            else:
                log.error("Checksum not match")
                os.remove("/usr/share/nginx/"+res['filename'])
            time.sleep(sleep_time)
        except Exception as e:
            log.error(e)
            time.sleep(30)

    
if __name__ == '__main__':
    main()

