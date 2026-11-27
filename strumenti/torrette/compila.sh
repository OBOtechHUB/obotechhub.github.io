#!/usr/bin/env bash
# Compila il Configuratore UFS (torrette/sorgente/*.jsx) in torrette/ufs.js: un solo file per il browser, React incluso.
# Serve bun e i pacchetti react e react-dom (anche installati globalmente con npm).
# Uso: bash strumenti/torrette/compila.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
tmp=$(mktemp -d)
mkdir -p "$tmp/node_modules"
radice=$(npm root -g)
for p in react react-dom scheduler; do
  if [ -d "node_modules/$p" ]; then ln -s "$PWD/node_modules/$p" "$tmp/node_modules/$p"; elif [ -d "$radice/$p" ]; then ln -s "$radice/$p" "$tmp/node_modules/$p"; elif [ -d "$radice/react-dom/node_modules/$p" ]; then ln -s "$radice/react-dom/node_modules/$p" "$tmp/node_modules/$p"; fi
done
cp torrette/sorgente/*.jsx torrette/sorgente/*.json "$tmp/"
( cd "$tmp" && bun build main.jsx --outfile=ufs.js --target=browser --format=iife --minify --define 'process.env.NODE_ENV="production"' )
{ echo "/* Configuratore UFS OBO Hub – file generato da strumenti/torrette/compila.sh dai sorgenti in torrette/sorgente (non modificare a mano). React (licenza MIT) incluso. */"; cat "$tmp/ufs.js"; } > torrette/ufs.js
rm -rf "$tmp"
echo "torrette/ufs.js: $(wc -c < torrette/ufs.js) byte"
# impronta dei file nell'indirizzo, così il browser non tiene in memoria la versione vecchia dopo una pubblicazione
v1=$(md5sum torrette/ufs.js | cut -c1-10); v2=$(md5sum torrette/ufs-app.js | cut -c1-10)
sed -i -E "s|src=\"\./ufs\.js(\?v=[a-z0-9]+)?\"|src=\"./ufs.js?v=$v1\"|; s|src=\"\./ufs-app\.js(\?v=[a-z0-9]+)?\"|src=\"./ufs-app.js?v=$v2\"|" torrette/index.html
