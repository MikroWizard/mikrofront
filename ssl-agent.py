#!/usr/bin/python
# -*- coding: utf-8 -*-

import subprocess
import socket
import threading
import logging
import os
import json
import re
import datetime
import time as _time
from pathlib import Path
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify
from werkzeug.exceptions import HTTPException as WerkzeugHTTPException

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ssl-agent")
log.setLevel(logging.INFO)

SSL_AGENT_LOG = "/conf/logs/ssl-agent.log"
SSL_AGENT_LOG_MAX_AGE = 86400
SSL_AGENT_LOG_BACKUPS = 1


def _setup_agent_logging():
    os.makedirs(os.path.dirname(SSL_AGENT_LOG), exist_ok=True)
    if os.path.exists(SSL_AGENT_LOG):
        if _time.time() - os.path.getmtime(SSL_AGENT_LOG) > SSL_AGENT_LOG_MAX_AGE:
            backup = SSL_AGENT_LOG + ".1"
            if os.path.exists(backup):
                os.remove(backup)
            os.rename(SSL_AGENT_LOG, backup)
    handler = RotatingFileHandler(SSL_AGENT_LOG, maxBytes=10 * 1024 * 1024, backupCount=SSL_AGENT_LOG_BACKUPS)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    log.addHandler(handler)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

_setup_agent_logging()

CONF_DIR = "/conf"
SSL_DIR = os.path.join(CONF_DIR, "ssl")
LETSENCRYPT_DIR = os.path.join(SSL_DIR, "letsencrypt")
LETSENCRYPT_WORK = os.path.join(SSL_DIR, "letsencrypt-work")
LETSENCRYPT_LOGS = os.path.join(SSL_DIR, "letsencrypt-logs")
MANUAL_DIR = os.path.join(SSL_DIR, "manual")
SERVER_CONF_PATH = os.path.join(CONF_DIR, "server-conf.json")
TOKEN_KEY = "ssl_agent_token"
NGINX_SSL_CONFIG = os.path.join(CONF_DIR, "nginx-ssl-server.conf")
NGINX_REDIRECT_CONFIG = os.path.join(CONF_DIR, "nginx-ssl-redirect.conf")

AUTH_TOKEN = None


def load_token():
    global AUTH_TOKEN
    for old_path in ("/conf/ssl-agent-token", "/opt/mikrowizard/ssl-agent-token", "/tmp/mw-ssl-agent-token"):
        try:
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            pass

    try:
        if os.path.exists(SERVER_CONF_PATH):
            with open(SERVER_CONF_PATH, "r") as f:
                conf = json.load(f)
            AUTH_TOKEN = conf.get(TOKEN_KEY)
            if AUTH_TOKEN:
                log.info("Loaded token from server-conf.json")
                return
    except Exception:
        pass

    import secrets as _secrets
    AUTH_TOKEN = _secrets.token_hex(32)
    try:
        conf = {}
        if os.path.exists(SERVER_CONF_PATH):
            with open(SERVER_CONF_PATH, "r") as f:
                conf = json.load(f)
        conf[TOKEN_KEY] = AUTH_TOKEN
        os.makedirs(os.path.dirname(SERVER_CONF_PATH), exist_ok=True)
        with open(SERVER_CONF_PATH, "w") as f:
            json.dump(conf, f, indent=2)
        log.info("Generated ssl_agent_token in server-conf.json")
    except Exception as e:
        log.warning("Could not persist token to server-conf.json: %s", e)


load_token()


def check_auth():
    token = request.headers.get("X-SSL-Agent-Token", "")
    return token == AUTH_TOKEN


def run_cmd(cmd, timeout=300):
    log.info("Running: %s", " ".join(cmd) if isinstance(cmd, list) else cmd)
    try:
        if isinstance(cmd, str):
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        else:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "success": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {"returncode": -1, "stdout": "", "stderr": "Command timed out after %ds" % timeout, "success": False}
    except Exception as e:
        return {"returncode": -1, "stdout": "", "stderr": str(e), "success": False}


def _get_certbot_path():
    for path in ("/usr/local/bin/certbot", "/usr/bin/certbot"):
        if os.path.exists(path) and os.access(path, os.X_OK):
            return path
    return None


def _get_host_gateway():
    try:
        with open("/proc/net/route") as f:
            for line in f.read().splitlines()[1:]:
                p = line.split()
                if p[1] == "00000000" and p[2] != "00000000":
                    gw = bytes.fromhex(p[2])[::-1]
                    return ".".join(str(b) for b in gw)
    except Exception:
        pass
    try:
        return socket.gethostbyname("host.docker.internal")
    except Exception:
        return None


def _port_listening(port_hex):
    try:
        with open("/proc/net/tcp") as f:
            for line in f.read().splitlines()[1:]:
                p = line.split()
                if len(p) > 3 and p[1].endswith(":" + port_hex) and p[3] == "0A":
                    return True
    except Exception:
        pass
    return False


def check_port_443():
    gateway = _get_host_gateway()

    if _port_listening("01BB"):
        if gateway:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                s.connect((gateway, 443))
                s.close()
                return "ok"
            except Exception:
                return "bound_not_exposed"
        return "bound_not_exposed"

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        probe.bind(("0.0.0.0", 443))
        probe.listen(1)
        probe.settimeout(1)
    except OSError:
        probe.close()
        return "bound_not_exposed"

    exposed = False
    if gateway:
        try:
            c = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            c.settimeout(2)
            c.connect((gateway, 443))
            c.close()
            exposed = True
        except Exception:
            exposed = False
    probe.close()
    return "available_not_bound" if exposed else "not_exposed"


def certbot_installed():
    path = _get_certbot_path()
    if not path:
        return False
    try:
        result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False


def get_cert_info():
    if not os.path.exists(NGINX_SSL_CONFIG):
        return None

    with open(NGINX_SSL_CONFIG, "r") as f:
        content = f.read()

    cert_path = None
    key_path = None
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("ssl_certificate ") and not line.startswith("ssl_certificate_key "):
            cert_path = line.split("ssl_certificate", 1)[1].strip().rstrip(";").strip()
        if line.startswith("ssl_certificate_key "):
            key_path = line.split("ssl_certificate_key", 1)[1].strip().rstrip(";").strip()

    if not cert_path:
        return None

    if not os.path.exists(cert_path):
        return None

    source = "manual"
    if LETSENCRYPT_DIR in cert_path:
        source = "letsencrypt"

    info = {
        "installed": True,
        "source": source,
        "domain": None,
        "issuer": None,
        "subject": None,
        "san": [],
        "not_before": None,
        "not_after": None,
        "days_remaining": None,
        "fingerprint": None,
    }

    result = run_cmd(["openssl", "x509", "-in", cert_path, "-noout", "-subject", "-issuer", "-dates",
                    "-fingerprint", "-ext", "subjectAltName"])

    for line in result["stdout"].split("\n") + result["stderr"].split("\n"):
        line = line.strip()
        if line.startswith("subject="):
            info["subject"] = line.split("=", 1)[1].strip()
            m = re.search(r"CN\s*=\s*([^,\s]+)", info["subject"])
            if m:
                info["domain"] = m.group(1)
        elif line.startswith("issuer="):
            info["issuer"] = line.split("=", 1)[1].strip()
        elif line.startswith("notBefore="):
            dt = datetime.datetime.strptime(line.split("=", 1)[1].strip(), "%b %d %H:%M:%S %Y %Z")
            info["not_before"] = dt.isoformat()
        elif line.startswith("notAfter="):
            dt = datetime.datetime.strptime(line.split("=", 1)[1].strip(), "%b %d %H:%M:%S %Y %Z")
            info["not_after"] = dt.isoformat()
            info["days_remaining"] = (dt - datetime.datetime.now()).days
        elif line.startswith("SHA256 Fingerprint="):
            info["fingerprint"] = line.split("=", 1)[1].strip()
        elif "DNS:" in line:
            sans = re.findall(r"DNS:([^,\s]+)", line)
            info["san"].extend(sans)

    return info


def get_force_ssl_state():
    if os.path.exists(NGINX_REDIRECT_CONFIG):
        with open(NGINX_REDIRECT_CONFIG, "r") as f:
            content = f.read()
        return "return 301 https" in content
    return False


def validate_pem_format(text, pem_type="CERTIFICATE"):
    if not text or not text.strip():
        return False, "empty"
    begin_marker = "-----BEGIN %s-----" % pem_type
    end_marker = "-----END %s-----" % pem_type
    if begin_marker not in text:
        return False, "Missing %s" % begin_marker
    if end_marker not in text:
        return False, "Missing %s" % end_marker
    return True, "ok"


def cert_key_match(cert_pem, key_pem):
    cert_path = "/tmp/_ssl_check_cert.pem"
    key_path = "/tmp/_ssl_check_key.pem"
    try:
        with open(cert_path, "w") as f:
            f.write(cert_pem)
        os.chmod(cert_path, 0o600)
        with open(key_path, "w") as f:
            f.write(key_pem)
        os.chmod(key_path, 0o600)
        cert_mod = run_cmd(["openssl", "x509", "-noout", "-modulus", "-in", cert_path])
        key_mod = run_cmd(["openssl", "rsa", "-noout", "-modulus", "-in", key_path])
        if "ENCRYPTED" in key_mod["stderr"] or "encrypted" in key_mod["stderr"]:
            return False, "Private key is encrypted with a passphrase. Please decrypt it first."
        if not cert_mod["success"] or not key_mod["success"]:
            return False, "Failed to read certificate or key: %s %s" % (cert_mod["stderr"], key_mod["stderr"])
        if cert_mod["stdout"].strip() == key_mod["stdout"].strip():
            return True, "ok"
        return False, "Certificate and private key do not match"
    finally:
        for p in [cert_path, key_path]:
            if os.path.exists(p):
                os.remove(p)


def nginx_test():
    try:
        result = subprocess.run(["/usr/sbin/nginx", "-t"], capture_output=True, text=True)
        return {"valid": result.returncode == 0, "output": (result.stdout + "\n" + result.stderr).strip()}
    except FileNotFoundError:
        return {"valid": False, "output": "nginx binary not found"}


def nginx_reload():
    try:
        result = subprocess.run(["/usr/sbin/nginx", "-s", "reload"], capture_output=True, text=True)
        return {"success": result.returncode == 0, "output": result.stdout + "\n" + result.stderr}
    except FileNotFoundError:
        return {"success": False, "output": "nginx binary not found"}


def generate_ssl_server_config(domain, cert_path, key_path):
    return """server {
    listen 443 ssl http2;
    ssl_certificate     %s;
    ssl_certificate_key %s;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    sendfile on;
    default_type application/octet-stream;

    gzip on;
    gzip_http_version 1.1;
    gzip_disable "MSIE [1-6]\\.";
    gzip_min_length 256;
    gzip_vary on;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css application/json application/javascript application/x-javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 9;

    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    location /terminal-ws/ {
        proxy_pass http://host.docker.internal:8201/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $realip_remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    location /agent/ {
        proxy_pass http://host.docker.internal:8202;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $realip_remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://host.docker.internal:8181;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $realip_remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /api/frontver {
        add_header Cache-Control 'no-store';
        add_header Cache-Control 'no-cache';
        expires 0;
        index version.json;
        alias /usr/share/nginx/html;
    }
}
""" % (cert_path, key_path)


app = Flask(__name__)


@app.before_request
def require_auth():
    if request.path == "/health":
        return
    if not check_auth():
        return jsonify({"error": "unauthorized"}), 401


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, WerkzeugHTTPException):
        return e
    log.exception("Unhandled error: %s", str(e))
    return jsonify({"error": "internal_error", "detail": str(e)}), 500


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/status", methods=["GET", "POST"])
def status():
    port_status = check_port_443()
    cert_info = get_cert_info()
    force_ssl = get_force_ssl_state()
    return jsonify({
        "port_443_available": port_status in ("ok", "available_not_bound"),
        "port_443_status": port_status,
        "https_configured": cert_info is not None,
        "force_ssl": force_ssl,
        "certificate": cert_info,
        "certbot_installed": certbot_installed(),
    })


@app.route("/generate-csr", methods=["POST"])
def generate_csr():
    data = request.get_json() or {}
    domain = data.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    country = data.get("country", "").strip()[:2].upper()
    state = data.get("state", "").strip()
    city = data.get("city", "").strip()
    org = data.get("org", "").strip()
    email = data.get("email", "").strip()
    key_size = data.get("key_size", "2048")

    key_path = "/tmp/_ssl_gen.key"
    csr_path = "/tmp/_ssl_gen.csr"

    subj = "/C=%s/ST=%s/L=%s/O=%s/CN=%s" % (country, state, city, org, domain)
    if email:
        subj += "/emailAddress=%s" % email

    result = run_cmd([
        "openssl", "req", "-new",
        "-newkey", "rsa:%s" % key_size,
        "-nodes",
        "-keyout", key_path,
        "-out", csr_path,
        "-subj", subj
    ])

    if not result["success"]:
        error_msg = result["stderr"] or result["stdout"]
        return jsonify({"error": "CSR generation failed", "output": error_msg}), 500

    with open(csr_path, "r") as f:
        csr_text = f.read()
    with open(key_path, "r") as f:
        key_text = f.read()

    for p in [key_path, csr_path]:
        if os.path.exists(p):
            os.remove(p)

    return jsonify({"csr": csr_text, "key": key_text})


@app.route("/install-cert", methods=["POST"])
def install_cert():
    data = request.get_json() or {}
    cert_pem = data.get("cert_pem", "").strip()
    key_pem = data.get("key_pem", "").strip()
    chain_pem = data.get("chain_pem", "").strip()

    valid, msg = validate_pem_format(cert_pem, "CERTIFICATE")
    if not valid:
        return jsonify({"error": "Invalid certificate PEM", "detail": msg}), 400
    valid, msg = validate_pem_format(key_pem, "PRIVATE KEY")
    if not valid:
        valid2, _ = validate_pem_format(key_pem, "RSA PRIVATE KEY")
        if not valid2:
            return jsonify({"error": "Invalid private key PEM", "detail": msg}), 400

    match_ok, match_msg = cert_key_match(cert_pem, key_pem)
    if not match_ok:
        return jsonify({"error": match_msg}), 400

    os.makedirs(MANUAL_DIR, exist_ok=True)
    fullchain_path = os.path.join(MANUAL_DIR, "fullchain.pem")
    privkey_path = os.path.join(MANUAL_DIR, "privkey.pem")

    fullchain = cert_pem.strip()
    if chain_pem.strip():
        fullchain += "\n" + chain_pem.strip()

    with open(fullchain_path, "w") as f:
        f.write(fullchain)
    os.chmod(fullchain_path, 0o600)
    with open(privkey_path, "w") as f:
        f.write(key_pem.strip())
    os.chmod(privkey_path, 0o600)

    result = run_cmd(["openssl", "x509", "-in", fullchain_path, "-noout", "-subject"])
    domain = "manual"
    m = re.search(r"CN\s*=\s*([^,\s]+)", result["stdout"])
    if m:
        domain = m.group(1)

    config_content = generate_ssl_server_config(domain, fullchain_path, privkey_path)
    with open(NGINX_SSL_CONFIG, "w") as f:
        f.write(config_content)

    test_result = nginx_test()
    if not test_result["valid"]:
        os.remove(NGINX_SSL_CONFIG)
        return jsonify({"error": "nginx config test failed", "output": test_result["output"]}), 400

    reload_result = nginx_reload()
    if not reload_result["success"]:
        return jsonify({"warning": "config installed but reload failed", "output": reload_result["output"]}), 200

    return jsonify({"success": True, "domain": domain, "fingerprint": get_cert_info().get("fingerprint")})


@app.route("/letsencrypt/request", methods=["POST"])
def letsencrypt_request():
    if not certbot_installed():
        return jsonify({"error": "certbot is not installed. Use the Install Certbot button."}), 500

    certbot_bin = _get_certbot_path()

    data = request.get_json() or {}
    domains = data.get("domains", [])
    email = data.get("email", "").strip()
    method = data.get("method", "http").strip()

    if not domains or not isinstance(domains, list) or len(domains) == 0:
        return jsonify({"error": "At least one domain is required"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400

    os.makedirs(LETSENCRYPT_DIR, exist_ok=True)
    os.makedirs(LETSENCRYPT_WORK, exist_ok=True)
    os.makedirs(LETSENCRYPT_LOGS, exist_ok=True)

    domain_args = []
    for d in domains:
        d = d.strip()
        if d:
            domain_args.extend(["-d", d])

    if not domain_args:
        return jsonify({"error": "At least one valid domain is required"}), 400

    if method == "http":
        cmd = [
            certbot_bin, "certonly",
            "--webroot",
            "--webroot-path", LETSENCRYPT_WORK,
            "--config-dir", LETSENCRYPT_DIR,
            "--work-dir", LETSENCRYPT_WORK,
            "--logs-dir", LETSENCRYPT_LOGS,
            "--agree-tos",
            "--non-interactive",
            "-m", email,
        ] + domain_args
    elif method == "dns":
        dns_provider = data.get("dns_provider", "").strip()
        dns_credentials = data.get("dns_credentials", {})
        if not dns_provider:
            return jsonify({"error": "DNS provider is required for DNS-01 challenge"}), 400
        creds_file = "/tmp/_ssl_dns_creds.ini"
        with open(creds_file, "w") as f:
            for k, v in dns_credentials.items():
                f.write("%s = %s\n" % (k, v))
        os.chmod(creds_file, 0o600)
        cmd = [
            certbot_bin, "certonly",
            "--authenticator", "dns-%s" % dns_provider,
            "--dns-%s-credentials" % dns_provider, creds_file,
            "--config-dir", LETSENCRYPT_DIR,
            "--work-dir", LETSENCRYPT_WORK,
            "--logs-dir", LETSENCRYPT_LOGS,
            "--agree-tos",
            "--non-interactive",
            "-m", email,
        ] + domain_args
    else:
        return jsonify({"error": "Invalid method. Use 'http' or 'dns'"}), 400

    result = run_cmd(cmd, timeout=120)
    if not result["success"]:
        return jsonify({"error": "Certificate request failed", "output": result["stderr"] or result["stdout"]}), 500

    primary_domain = domains[0].strip()
    cert_path = os.path.join(LETSENCRYPT_DIR, "live", primary_domain, "fullchain.pem")
    key_path = os.path.join(LETSENCRYPT_DIR, "live", primary_domain, "privkey.pem")
    if not os.path.exists(cert_path):
        return jsonify({"error": "Certificate files not found at expected path", "output": result["stdout"]}), 500

    config_content = generate_ssl_server_config(primary_domain, cert_path, key_path)
    with open(NGINX_SSL_CONFIG, "w") as f:
        f.write(config_content)
    test_result = nginx_test()
    if not test_result["valid"]:
        os.remove(NGINX_SSL_CONFIG)
        return jsonify({"error": "nginx config test failed after cert install", "output": test_result["output"]}), 400
    nginx_reload()

    cert_info = get_cert_info()
    return jsonify({"success": True, "domain": primary_domain, "certificate": cert_info, "output": result["stdout"]})


@app.route("/letsencrypt/renew", methods=["POST"])
def letsencrypt_renew():
    if not certbot_installed():
        return jsonify({"error": "certbot is not installed"}), 500
    certbot_bin = _get_certbot_path()
    data = request.get_json() or {}
    domain = data.get("domain", "").strip()
    cmd = [certbot_bin, "renew", "--config-dir", LETSENCRYPT_DIR, "--work-dir", LETSENCRYPT_WORK,
           "--logs-dir", LETSENCRYPT_LOGS, "--non-interactive"]
    if domain:
        cmd.extend(["--cert-name", domain])
    result = run_cmd(cmd, timeout=120)
    if not result["success"]:
        return jsonify({"error": "Certificate renewal failed", "output": result["stderr"] or result["stdout"]}), 500
    nginx_reload()
    return jsonify({"success": True, "output": result["stdout"]})


@app.route("/letsencrypt/revoke", methods=["POST"])
def letsencrypt_revoke():
    if not certbot_installed():
        return jsonify({"error": "certbot is not installed"}), 500
    data = request.get_json() or {}
    domain = data.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "Domain is required"}), 400
    certbot_bin = _get_certbot_path()
    cmd = [certbot_bin, "revoke", "--config-dir", LETSENCRYPT_DIR, "--work-dir", LETSENCRYPT_WORK,
           "--logs-dir", LETSENCRYPT_LOGS, "--cert-name", domain, "--non-interactive"]
    result = run_cmd(cmd, timeout=60)
    if not result["success"]:
        return jsonify({"error": "Certificate revocation failed", "output": result["stderr"] or result["stdout"]}), 500
    if os.path.exists(NGINX_SSL_CONFIG):
        os.remove(NGINX_SSL_CONFIG)
    with open(NGINX_REDIRECT_CONFIG, "w") as f:
        f.write("# SSL redirect disabled\n")
    nginx_reload()
    return jsonify({"success": True, "output": result["stdout"]})


@app.route("/letsencrypt/delete", methods=["POST"])
def letsencrypt_delete():
    if not certbot_installed():
        return jsonify({"error": "certbot is not installed"}), 500
    data = request.get_json() or {}
    domain = data.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "Domain is required"}), 400
    certbot_bin = _get_certbot_path()
    cmd = [certbot_bin, "delete", "--config-dir", LETSENCRYPT_DIR, "--work-dir", LETSENCRYPT_WORK,
           "--logs-dir", LETSENCRYPT_LOGS, "--cert-name", domain, "--non-interactive"]
    result = run_cmd(cmd, timeout=60)
    if os.path.exists(NGINX_SSL_CONFIG):
        os.remove(NGINX_SSL_CONFIG)
    with open(NGINX_REDIRECT_CONFIG, "w") as f:
        f.write("# SSL redirect disabled\n")
    nginx_reload()
    return jsonify({"success": True, "output": result["stdout"] + "\n" + result["stderr"]})


@app.route("/force-ssl", methods=["POST"])
def force_ssl_toggle():
    data = request.get_json() or {}
    enabled = data.get("enabled", False)
    if enabled and not os.path.exists(NGINX_SSL_CONFIG):
        return jsonify({"error": "No SSL certificate installed. Install a certificate first."}), 400
    if enabled:
        redirect_config = """server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root %s;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
""" % LETSENCRYPT_WORK
    else:
        redirect_config = "# SSL redirect disabled\n"
    with open(NGINX_REDIRECT_CONFIG, "w") as f:
        f.write(redirect_config)
    test_result = nginx_test()
    if not test_result["valid"]:
        with open(NGINX_REDIRECT_CONFIG, "w") as f:
            f.write("# SSL redirect disabled\n")
        return jsonify({"error": "nginx config test failed", "output": test_result["output"]}), 400
    nginx_reload()
    return jsonify({"success": True, "force_ssl": enabled})


@app.route("/disable", methods=["POST"])
def disable_ssl():
    if os.path.exists(NGINX_SSL_CONFIG):
        os.remove(NGINX_SSL_CONFIG)
    with open(NGINX_REDIRECT_CONFIG, "w") as f:
        f.write("# SSL redirect disabled\n")
    nginx_reload()
    return jsonify({"success": True})


@app.route("/nginx/test", methods=["POST"])
def nginx_test_route():
    result = nginx_test()
    return jsonify(result)


@app.route("/nginx/reload", methods=["POST"])
def nginx_reload_route():
    result = nginx_reload()
    return jsonify(result)


@app.route("/nginx/config", methods=["POST"])
def nginx_config_route():
    data = request.get_json() or {}
    action = data.get("action", "get")
    if action == "get":
        content = ""
        if os.path.exists(NGINX_SSL_CONFIG):
            with open(NGINX_SSL_CONFIG, "r") as f:
                content = f.read()
        return jsonify({"content": content})
    elif action == "set":
        content = data.get("content", "")
        with open(NGINX_SSL_CONFIG, "w") as f:
            f.write(content)
        test_result = nginx_test()
        if not test_result["valid"]:
            return jsonify({"error": "config test failed", "output": test_result["output"]}), 400
        nginx_reload()
        return jsonify({"success": True})
    return jsonify({"error": "invalid action"}), 400


# ---- Manual DNS Challenge (async) ----

DNS_HOOK_SCRIPT = "/tmp/dns-manual-hook.sh"
DNS_HOOK_OUTPUT = "/tmp/dns-manual-output.txt"
DNS_HOOK_SIGNAL = "/tmp/dns-manual-done.txt"
DNS_HOOK_STATE = "/tmp/dns-manual-state.txt"
_certbot_thread = None


def _create_dns_hook_script():
    script = """#!/bin/bash
cleanup() {
    rm -f \"""" + DNS_HOOK_SIGNAL + """\"
}
trap cleanup EXIT
echo "${CERTBOT_DOMAIN}|${CERTBOT_VALIDATION}" >> \"""" + DNS_HOOK_OUTPUT + """\"
for i in $(seq 1 180); do
    if [ -f \"""" + DNS_HOOK_SIGNAL + """\" ]; then
        rm -f \"""" + DNS_HOOK_SIGNAL + """\"
        exit 0
    fi
    sleep 2
done
exit 1
"""
    with open(DNS_HOOK_SCRIPT, "w") as f:
        f.write(script)
    os.chmod(DNS_HOOK_SCRIPT, 0o755)


def _run_certbot_dns_manual(cmd, domains):
    try:
        with open(DNS_HOOK_STATE, "w") as f:
            f.write("running")
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = proc.communicate(timeout=600)
        exit_code = proc.returncode
        output = (stdout or "") + "\n" + (stderr or "")
        log.info("certbot manual DNS exit=%s", exit_code)

        if exit_code != 0:
            with open(DNS_HOOK_STATE, "w") as f:
                    f.write("error\n" + output[:5000])
            return

        primary = domains[0].strip()
        cert_path = os.path.join(LETSENCRYPT_DIR, "live", primary, "fullchain.pem")
        key_path = os.path.join(LETSENCRYPT_DIR, "live", primary, "privkey.pem")

        if os.path.exists(cert_path):
            config_content = generate_ssl_server_config(primary, cert_path, key_path)
            with open(NGINX_SSL_CONFIG, "w") as f:
                f.write(config_content)
            test_result = nginx_test()
            if test_result["valid"]:
                nginx_reload()
                with open(DNS_HOOK_STATE, "w") as f:
                    f.write("success")
            else:
                os.remove(NGINX_SSL_CONFIG)
                with open(DNS_HOOK_STATE, "w") as f:
                    f.write("error\nnginx test failed:\n" + test_result["output"][:1000])
        else:
            with open(DNS_HOOK_STATE, "w") as f:
                f.write("error\nCertificate files not found after certbot completion\n" + output[:2000])
    except Exception as e:
        log.exception("certbot background thread error")
        try:
            with open(DNS_HOOK_STATE, "w") as f:
                f.write("error\n" + str(e)[:1000])
        except Exception:
            pass


@app.route("/letsencrypt/dns-manual/start", methods=["POST"])
def dns_manual_start():
    global _certbot_thread
    if not certbot_installed():
        return jsonify({"error": "certbot is not installed"}), 500

    data = request.get_json() or {}
    domains = data.get("domains", [])
    email = data.get("email", "").strip()

    if not domains or len(domains) == 0:
        return jsonify({"error": "At least one domain is required"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400

    os.makedirs(LETSENCRYPT_DIR, exist_ok=True)
    os.makedirs(LETSENCRYPT_WORK, exist_ok=True)
    os.makedirs(LETSENCRYPT_LOGS, exist_ok=True)

    for f in (DNS_HOOK_OUTPUT, DNS_HOOK_SIGNAL, DNS_HOOK_STATE):
        if os.path.exists(f):
            os.remove(f)

    _create_dns_hook_script()

    domain_args = []
    for d in domains:
        d = d.strip()
        if d:
            domain_args.extend(["-d", d])

    cmd = [
        _get_certbot_path(), "certonly",
        "--manual",
        "--preferred-challenges", "dns",
        "--manual-auth-hook", DNS_HOOK_SCRIPT,
        "--config-dir", LETSENCRYPT_DIR,
        "--work-dir", LETSENCRYPT_WORK,
        "--logs-dir", LETSENCRYPT_LOGS,
        "--agree-tos",
        "--non-interactive",
        "-m", email,
    ] + domain_args

    log.info("Starting background certbot: %s", " ".join(cmd))
    _certbot_thread = threading.Thread(target=_run_certbot_dns_manual, args=(cmd, domains), daemon=True)
    _certbot_thread.start()

    return jsonify({"success": True, "status": "starting", "message": "Certbot started. Poll /letsencrypt/dns-manual/status for TXT records."})


@app.route("/letsencrypt/dns-manual/status", methods=["POST"])
def dns_manual_status():
    state = "waiting"
    state_full = ""
    if os.path.exists(DNS_HOOK_STATE):
        with open(DNS_HOOK_STATE, "r") as f:
            state_full = f.read().strip()
            state = state_full.split("\n")[0]

    records = []
    if os.path.exists(DNS_HOOK_OUTPUT):
        with open(DNS_HOOK_OUTPUT, "r") as f:
            for line in f:
                line = line.strip()
                if "|" in line:
                    parts = line.split("|", 1)
                    records.append({
                        "record": "_acme-challenge." + parts[0],
                        "type": "TXT",
                        "value": parts[1].strip(),
                    })

    error_output = ""
    if state == "error":
        error_output = state_full.split("\n", 1)[1] if "\n" in state_full else state_full

    return jsonify({"state": state, "records": records, "error": error_output})


@app.route("/letsencrypt/dns-manual/continue", methods=["POST"])
def dns_manual_continue():
    if not os.path.exists(DNS_HOOK_STATE) and not os.path.exists(DNS_HOOK_OUTPUT):
        return jsonify({"error": "No pending DNS challenge"}), 400

    with open(DNS_HOOK_SIGNAL, "w") as f:
        f.write("ok")

    return jsonify({"success": True, "status": "signaled", "message": "Hook signalled. Poll status for completion."})


# ---- Migration Script ----

MIGRATION_SCRIPT_PATH = os.path.join(CONF_DIR, "recreate-ssl.sh")


def _generate_migration_script():
    script = """#!/bin/bash
set -e
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash /opt/mikrowizard/recreate-ssl.sh"
    exit 1
fi

CONTAINER=""

matches=$(docker ps -a --format '{{.Names}}' | grep -i mikrofront || true)
count=$(echo "$matches" | grep -c . 2>/dev/null || echo 0)

if [ "$count" -eq 1 ]; then
    CONTAINER=$(echo "$matches")
    echo "Found container: $CONTAINER"
elif [ "$count" -gt 1 ]; then
    echo "Multiple containers found matching 'mikrofront':"
    echo ""
    i=1
    echo "$matches" | while read name; do
        status=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo "unknown")
        ports=$(docker port "$name" 2>/dev/null | tr '\\n' ' ' || echo "none")
        echo "  $i) $name  (status: $status, ports: $ports)"
        i=$((i+1))
    done
    echo ""
    read -p "Select number (1-$count): " choice
    CONTAINER=$(echo "$matches" | sed -n "${choice}p")
else
    echo "No container with 'mikrofront' in name found."
    echo "Available containers:"
    docker ps -a --format '  {{.Names}}  ({{.Status}})'
    echo ""
    read -p "Type container name to add port 443: " CONTAINER
fi

if [ -z "$CONTAINER" ]; then
    echo "No container selected. Aborting."
    exit 1
fi

ISRUNNING=$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null || echo "false")

echo ""
echo "Container: $CONTAINER"
echo "This will:"
echo "  1. Save all updates to a snapshot image"
echo "  2. Recreate it with port 443 exposed"
echo ""
read -p "Proceed? [Y/n] " confirm
if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
    echo "Aborted."
    exit 0
fi

echo "Committing $CONTAINER to snapshot (preserving updates)..."
docker commit "$CONTAINER" mikrofront-updated

echo "Stopping $CONTAINER..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

echo "Starting $CONTAINER with HTTPS (ports 80 + 443)..."
docker run -d --restart unless-stopped \\
    --add-host=host.docker.internal:host-gateway \\
    --name "$CONTAINER" \\
    -p 80:80 -p 443:443 \\
    -v /opt/mikrowizard/:/conf/ \\
    mikrofront-updated /bin/sh -c "cron; /usr/bin/python3 /ssl-agent.py & nginx -g 'daemon off;'"

sleep 3
if docker ps --filter "name=$CONTAINER" --filter "status=running" | grep -q "$CONTAINER"; then
    echo ""
    echo "SUCCESS: $CONTAINER is running with HTTPS on port 443."
    echo "All updates have been preserved."
else
    echo "ERROR: Container failed. Run: docker logs $CONTAINER"
fi
"""
    os.makedirs(os.path.dirname(MIGRATION_SCRIPT_PATH), exist_ok=True)
    with open(MIGRATION_SCRIPT_PATH, "w") as f:
        f.write(script)
    os.chmod(MIGRATION_SCRIPT_PATH, 0o755)
    log.info("Generated migration script")
    return script


@app.route("/install-certbot", methods=["POST"])
def install_certbot():
    if certbot_installed():
        return jsonify({"success": True, "message": "certbot already installed"})

    with open("/tmp/install-certbot-state", "w") as f:
        f.write("running")

    def _do_install():
        try:
            run_cmd("apt-get remove -y -qq certbot python3-certbot 2>/dev/null || true", timeout=30)
            run_cmd("/usr/bin/python3 -m pip install certbot --break-system-packages --force-reinstall", timeout=120)
            if certbot_installed():
                with open("/tmp/install-certbot-state", "w") as f:
                    f.write("success")
            else:
                with open("/tmp/install-certbot-state", "w") as f:
                    f.write("error\nInstall failed. Try manually: pip install certbot --break-system-packages")
        except Exception as e:
            with open("/tmp/install-certbot-state", "w") as f:
                f.write("error\n" + str(e))

    threading.Thread(target=_do_install, daemon=True).start()
    return jsonify({"success": True, "status": "started"})


@app.route("/install-certbot/status", methods=["POST"])
def install_certbot_status():
    state = "running"
    if os.path.exists("/tmp/install-certbot-state"):
        with open("/tmp/install-certbot-state", "r") as f:
            content = f.read().strip()
            state = content.split("\n")[0]
    if state == "success":
        return jsonify({"state": "success", "installed": True})
    elif state.startswith("error"):
        error = content.split("\n", 1)[1] if "\n" in content else content
        return jsonify({"state": "error", "error": error})
    return jsonify({"state": "running"})


@app.route("/migration-script/generate", methods=["POST"])
def generate_migration_script():
    script = _generate_migration_script()
    return jsonify({"success": True, "script": script})


_generate_migration_script()


if __name__ == "__main__":
    log.info("ssl-agent starting on 0.0.0.0:8199")
    app.run(host="0.0.0.0", port=8199, debug=False)
