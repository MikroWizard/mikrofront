#!/bin/bash
# release-front.sh: build the MikroFront update package for mikrowizard.com
# (get_update / download_update, applied by front-update.py inside the mikrofront container).
#
#   npm run build --prod          # first: fresh dist/mikrowizard
#   ./release-front.sh [VERSION]  # default VERSION = package.json "version"
#
# Package layout. Updater 2.0 (old images) extracts the zip, then runs its own steps for a
# top-level nginx.conf ("nginx -t": not in cron's PATH) and ssl-agent.py ("pkill": not in
# the image); either one aborts it before post_update.sh and its self-update. So nothing
# it acts on except post_update.sh and front-update.py is at the top level:
#   html/                     the web UI (dist/mikrowizard), WITHOUT version.json
#   version.json              VERSION; post_update.sh copies it to html/ as its last step, so
#                             an aborted update still reports the old version and is retried
#   nginx/default.conf        -> /etc/nginx/conf.d/default.conf (post_update.sh: nginx -t,
#                             reload, rollback on error)
#   ssl-agent/ssl-agent.py    SSL management agent (updater 2.1 or post_update.sh install it)
#   post_update.sh            the install steps above + repairs, run after extracting
#   front-update.py           the updater itself (self-update, after post_update.sh)
# Output: dist/mikrofront-VERSION-SHA256.zip (+ the same name as an extracted folder to inspect).
set -euo pipefail
cd "$(dirname "$0")"

die() { echo "ERROR: $*" >&2; exit 1; }
ok() { echo "  ok  $*"; }

VERSION="${1:-$(python3 -c 'import json; print(json.load(open("package.json"))["version"])')}"
NAME="$(python3 -c 'import json; print(json.load(open("package.json")).get("name", "MikroWizard"))')"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "version '$VERSION' is not X.Y.Z"
DIST=dist/mikrowizard

echo "== MikroFront $VERSION package"
echo "-- checks"
[ -f "$DIST/index.html" ] || die "$DIST/index.html missing: run 'npm run build --prod' first"
NEWER=$(find src -type f -newer "$DIST/index.html" | head -5 || true)
[ -z "$NEWER" ] || die "src changed after the last build (e.g. $(echo "$NEWER" | head -1)): rebuild first"
ok "build $DIST is newer than src/"
for f in front-update.py ssl-agent.py nginx.conf post_update.sh; do
    [ -f "$f" ] || die "$f missing"
done
python3 - <<'PY' || die "python syntax"
import sys
for f in ("front-update.py", "ssl-agent.py"):
    compile(open(f, encoding="utf-8").read(), f, "exec")
PY
ok "front-update.py, ssl-agent.py compile"
bash -n post_update.sh || die "post_update.sh syntax"
ok "post_update.sh syntax"
grep -q 'ssl-agent/' front-update.py || die "front-update.py does not handle ssl-agent/ssl-agent.py"
grep -q 'ssl-agent/ssl-agent.py' post_update.sh || die "post_update.sh does not install ssl-agent/ssl-agent.py"
grep -q 'nginx/default.conf' post_update.sh || die "post_update.sh does not install nginx/default.conf"
grep -q 'PKG_DIR/version.json' post_update.sh || die "post_update.sh does not install version.json"
ok "post_update.sh installs nginx/default.conf, ssl-agent/, version.json"
grep -q 'location /ssl-internal/' nginx.conf || die "nginx.conf has no /ssl-internal/ location (SSL management)"
if grep -E '^\s*include\s+/conf/nginx-ssl-[a-z]+\.conf' nginx.conf >/dev/null; then
    die "nginx.conf includes /conf/nginx-ssl-*.conf without [.] glob: nginx -t fails on containers without the file"
fi
ok "nginx.conf (/ssl-internal/, optional SSL includes)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -a "$DIST" "$STAGE/html"
rm -f "$STAGE/html/version.json"
python3 - "$STAGE/version.json" "$VERSION" "$NAME" <<'PY'
import json, sys
json.dump({"version": sys.argv[2], "name": sys.argv[3]}, open(sys.argv[1], "w"))
PY
cp post_update.sh front-update.py "$STAGE/"
mkdir "$STAGE/nginx"
cp nginx.conf "$STAGE/nginx/default.conf"
mkdir "$STAGE/ssl-agent"
cp ssl-agent.py "$STAGE/ssl-agent/ssl-agent.py"
chmod 755 "$STAGE/front-update.py" "$STAGE/post_update.sh" "$STAGE/ssl-agent/ssl-agent.py"

echo "-- zip"
TMPZIP="$(mktemp -u).zip"
python3 - "$STAGE" "$TMPZIP" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        dirs.sort()
        rel = os.path.relpath(root, src)
        if rel != ".":
            z.write(root, rel + "/")
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, src))
PY
python3 - "$TMPZIP" "$VERSION" <<'PY' || die "package verification failed"
import json, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
names = set(z.namelist())
assert z.testzip() is None, "corrupt zip"
for need in ("html/index.html", "version.json", "nginx/default.conf", "post_update.sh",
             "front-update.py", "ssl-agent/ssl-agent.py"):
    assert need in names, "missing " + need
for bad in ("ssl-agent.py", "nginx.conf", "html/version.json"):
    assert bad not in names, bad + " in the package: breaks updater 2.0 (see the layout above)"
assert json.loads(z.read("version.json"))["version"] == sys.argv[2], "version.json"
assert not any(n.startswith(("/", "..")) or "/../" in n for n in names), "unsafe path"
print("  ok  %d entries, layout verified" % len(names))
PY
SHA="$(sha256sum "$TMPZIP" | awk '{print $1}')"
OUT="dist/mikrofront-$VERSION-$SHA"
mv "$TMPZIP" "$OUT.zip"
rm -rf "$OUT" && mkdir -p "$OUT" && python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$OUT.zip" "$OUT"

echo
echo "== done"
echo "  file    : $OUT.zip"
echo "  version : $VERSION"
echo "  sha256  : $SHA"
echo "  size    : $(du -h "$OUT.zip" | cut -f1)"
echo
echo "Upload it as the MikroFront $VERSION update on mikrowizard.com (filename + sha256 above)."
echo "Containers with front version < $VERSION get it at their next hourly check."
