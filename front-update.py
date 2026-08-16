#!/usr/bin/python
# -*- coding: utf-8 -*-

import time
import datetime
import requests
import logging
import os
import hashlib
import zipfile
import subprocess
import json
import shutil
from cryptography.fernet import Fernet 
import sys
import signal
from logging.handlers import RotatingFileHandler



log = logging.getLogger("updater")
log.setLevel(logging.INFO)

API_URL="http://host.docker.internal:8181"
Config_File="/conf/server-conf.json"
Version_File="/usr/share/nginx/html/version.json"
SCRIPT_VERSION="2.0"
UPDATE_CHECK_FILE = "/conf/front-update-last-check"
CHECK_INTERVAL = 1800
CYCLE_SLEEP = 120
SSL_AGENT_RETRY = 5

LOG_FILE = "/conf/logs/front-updater.log"
LOG_MAX_AGE = 86400
LOG_BACKUP_COUNT = 1

def _setup_logging():
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    handler = RotatingFileHandler(LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=LOG_BACKUP_COUNT)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    log.addHandler(handler)
    logging.getLogger().addHandler(handler)
    _rotate_old_logs()


def _rotate_old_logs():
    if os.path.exists(LOG_FILE):
        if time.time() - os.path.getmtime(LOG_FILE) > LOG_MAX_AGE:
            backup = LOG_FILE + ".1"
            if os.path.exists(backup):
                os.remove(backup)
            os.rename(LOG_FILE, backup)
            log.info("Rotated old log (>24h)")
            return True
    return False


_setup_logging()


def check_sha256(filename, expect):
    """Check if the file with the name "filename" matches the SHA-256 sum
    in "expect"."""
    h = hashlib.sha256()
    try:
        with open(filename, 'rb') as fh:
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
    key = Fernet.generate_key() 
    cipher_suite = Fernet(key) 
    encrypted_password = cipher_suite.encrypt(text.encode()).decode() 
    return encrypted_password
     

def decrypt_data(text,key):
    cipher_suite = Fernet(key) 
    decrypted_password = cipher_suite.decrypt(text.encode()).decode()
    return decrypted_password

def nginx_test():
    try:
        result = subprocess.run(["/usr/sbin/nginx", "-t"], capture_output=True, text=True)
        return result.returncode == 0, (result.stdout + "\n" + result.stderr).strip()
    except FileNotFoundError:
        return False, "nginx binary not found: /usr/sbin/nginx"

def backup_nginx_config():
    conf_path = "/etc/nginx/conf.d/default.conf"
    bak_path = "/conf/nginx.conf.bak"
    if os.path.exists(conf_path):
        shutil.copy2(conf_path, bak_path)
        log.info("Backed up nginx.conf to %s", bak_path)
        return bak_path
    return None

def check_ssl_agent():
    try:
        r = requests.get("http://127.0.0.1:8199/health", timeout=1)
        if r.status_code == 200:
            return True
    except Exception:
        pass
    return False

def _ensure_flask():
    try:
        import flask
    except ImportError:
        log.info("Installing flask...")
        subprocess.run(["/usr/bin/python3", "-m", "pip", "install", "flask", "--break-system-packages"],
                       capture_output=True)

def _ensure_certbot():
    for certbot_path in ("/usr/local/bin/certbot", "/usr/bin/certbot"):
        if os.path.exists(certbot_path) and os.access(certbot_path, os.X_OK):
            return True
    log.info("Installing certbot...")
    subprocess.run(["/usr/bin/python3", "-m", "pip", "install", "certbot", "--break-system-packages"],
                   capture_output=True)
    return False

def kill_ssl_agent():
    me = os.getpid()
    killed = False
    for entry in os.listdir("/proc"):
        if not entry.isdigit() or int(entry) == me:
            continue
        try:
            with open("/proc/%s/cmdline" % entry, "rb") as f:
                cmdline = f.read().decode(errors="ignore")
        except OSError:
            continue
        if "/ssl-agent.py" in cmdline:
            try:
                os.kill(int(entry), signal.SIGTERM)
                log.info("Sent SIGTERM to ssl-agent pid %s", entry)
                killed = True
            except OSError as e:
                log.warning("Failed to kill ssl-agent pid %s: %s", entry, e)
    return killed


def start_ssl_agent():
    if not os.path.exists("/ssl-agent.py"):
        return False
    _ensure_flask()
    _ensure_certbot()
    log.info("Starting ssl-agent...")
    subprocess.Popen(["/usr/bin/python3", "/ssl-agent.py"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(10):
        if check_ssl_agent():
            return True
        time.sleep(1)
    return False

def should_check_update():
    if not os.path.exists(UPDATE_CHECK_FILE):
        return True
    try:
        with open(UPDATE_CHECK_FILE, "r") as f:
            last = float(f.read().strip())
        if os.stat("/proc/1").st_ctime > last:
            log.info("Container restarted, forcing update check")
            return True
        return (time.time() - last) >= CHECK_INTERVAL
    except Exception:
        return True

def mark_update_checked():
    os.makedirs(os.path.dirname(UPDATE_CHECK_FILE), exist_ok=True)
    with open(UPDATE_CHECK_FILE, "w") as f:
        f.write(str(time.time()))

def _ensure_ssl_conf_files():
    for f in ("/conf/nginx-ssl-redirect.conf", "/conf/nginx-ssl-server.conf"):
        if not os.path.exists(f):
            os.makedirs(os.path.dirname(f), exist_ok=True)
            with open(f, "w") as fh:
                fh.write("# created by front-update\n")


def extract_zip_reload(filename,dst):
    """Extract the contents of the zip file "filename" to the directory
    "dst". Then reload the updated modules."""
    try:
        with zipfile.ZipFile(filename, 'r') as zip_ref:
            zip_ref.extractall(dst)
    except Exception as e:
        log.error("Failed to extract zip %s: %s", filename, e)
        return

    # --- nginx.conf update (isolated) ---
    try:
        nginx_conf_src = os.path.join(dst, "nginx.conf")
        if os.path.exists(nginx_conf_src):
            log.info("Validating and updating nginx.conf...")
            os.makedirs("/etc/nginx/conf.d", exist_ok=True)
            _ensure_ssl_conf_files()
            backup_nginx_config()
            shutil.move(nginx_conf_src, "/etc/nginx/conf.d/default.conf")
            valid, output = nginx_test()
            if valid:
                log.info("nginx config test passed, reloading...")
                subprocess.run(["/usr/sbin/nginx", "-s", "reload"], check=False)
            else:
                log.error("nginx config test FAILED: %s", output)
                bak_path = "/conf/nginx.conf.bak"
                if os.path.exists(bak_path):
                    shutil.move(bak_path, "/etc/nginx/conf.d/default.conf")
                    log.info("Rolled back to previous nginx.conf")
                    subprocess.run(["/usr/sbin/nginx", "-s", "reload"], check=False)
    except Exception as e:
        log.error("nginx.conf update failed: %s", e)

    # --- ssl-agent.py handling (isolated) ---
    try:
        ssl_agent_src = os.path.join(dst, "ssl-agent.py")
        if os.path.exists(ssl_agent_src):
            log.info("Updating ssl-agent.py...")
            shutil.move(ssl_agent_src, "/ssl-agent.py")
            os.chmod("/ssl-agent.py", 0o755)
            kill_ssl_agent()
            time.sleep(1)
            start_ssl_agent()
    except Exception as e:
        log.error("ssl-agent.py update failed: %s", e)

    # --- post_update.sh (isolated) ---
    try:
        post_update_src = os.path.join(dst, "post_update.sh")
        if os.path.exists(post_update_src):
            log.info("Running post_update.sh...")
            result = subprocess.run(["bash", post_update_src], capture_output=True, text=True)
            if result.stdout:
                log.info("post_update.sh stdout: %s", result.stdout[:4000])
            if result.stderr:
                log.warning("post_update.sh stderr: %s", result.stderr[:4000])
            if os.path.exists(post_update_src):
                os.remove(post_update_src)
    except Exception as e:
        log.error("post_update.sh failed: %s", e)

    # --- front-update.py self-update (isolated) ---
    should_restart = False
    try:
        front_update_src = os.path.join(dst, "front-update.py")
        if os.path.exists(front_update_src):
            log.info("Updating front-update.py...")
            shutil.move(front_update_src, "/front-update.py")
            os.chmod("/front-update.py", 0o755)
            should_restart = True
    except Exception as e:
        log.error("front-update.py self-update failed: %s", e)

    try:
        os.remove(filename)
    except Exception:
        pass

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
 

def do_update_check():
    try:
        res = get_serial_from_api()
    except Exception as e:
        log.error("Failed to get serial from API: %s", e)
        return
    if not res:
        log.error("Empty response from get_serial_from_api")
        return
    hwid = res['serial']
    username = res['username']
    version = get_version_from_file()

    params = {
        "serial_number": hwid,
        "username": username.strip(),
        "front": True,
        "version": version,
        "script_version": SCRIPT_VERSION
    }
    url = "https://mikrowizard.com/wp-json/mikrowizard/v1/get_update"
    try:
        response = requests.post(url, json=params, timeout=30)
        res = response
    except Exception as e:
        log.error("Update check request failed: %s", e)
        return

    try:
        if res.status_code == 200:
            res = res.json()
        if 'token' in res:
            params = {
                "token": res['token'],
                "file_name": res['filename'],
                "username": username.strip(),
                "front": True
            }
            log.info("Update available/Downloading...")
        else:
            log.info("Update not available")
            return
    except Exception as e:
        log.error("Update check response parsing failed: %s", e)
        return

    if check_sha256("/usr/share/nginx/" + res['filename'], res['sha256']):
        log.info("Checksum match, File exist, reapplying...")
        extract_zip_reload("/usr/share/nginx/" + res['filename'], "/usr/share/nginx/")
        return
    download_url = "https://mikrowizard.com/wp-json/mikrowizard/v1/download_update"
    try:
        r = requests.post(download_url, json=params, stream=True, timeout=120)
    except Exception as e:
        log.error("Download request failed: %s", e)
        return
    if "invalid" in r.text or r.text == 'false':
        log.error("Invalid download response: %s", r.text[:200])
        return
    try:
        with open("/usr/share/nginx/" + res['filename'], 'wb') as fd:
            for chunk in r.iter_content(chunk_size=128):
                fd.write(chunk)
    except Exception as e:
        log.error("Download write failed: %s", e)
        try:
            os.remove("/usr/share/nginx/" + res['filename'])
        except Exception:
            pass
        return
    if check_sha256("/usr/share/nginx/" + res['filename'], res['sha256']):
        log.info("Update downloaded: %s", res['filename'])
        extract_zip_reload("/usr/share/nginx/" + res['filename'], "/usr/share/nginx/")
    else:
        log.error("Checksum mismatch after download")
        try:
            os.remove("/usr/share/nginx/" + res['filename'])
        except Exception:
            pass


LOCK_FILE = "/tmp/front-update.lock"


def main():
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
    except FileExistsError:
        try:
            with open(LOCK_FILE, "r") as f:
                old_pid = int(f.read().strip())
            os.kill(old_pid, 0)
        except (OSError, ValueError):
            try:
                os.remove(LOCK_FILE)
            except Exception:
                pass
            try:
                fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
            except FileExistsError:
                exit()
        else:
            print("Already running")
            exit()

    try:
        _ensure_ssl_conf_files()
        while True:
            _rotate_old_logs()

            agent_up = False
            try:
                agent_up = check_ssl_agent() or start_ssl_agent()
            except Exception as e:
                log.error("ssl-agent health check failed: %s", e)

            if should_check_update():
                try:
                    mark_update_checked()
                    do_update_check()
                except Exception as e:
                    log.error("update check failed: %s", e)

            time.sleep(CYCLE_SLEEP if agent_up else SSL_AGENT_RETRY)
    finally:
        try:
            os.remove(LOCK_FILE)
        except Exception:
            pass

    
if __name__ == '__main__':
    main()
