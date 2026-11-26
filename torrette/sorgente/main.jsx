// Punto di ingresso del Configuratore UFS per OBO Hub: espone window.OBOTorrette.monta(elemento, props).
// Si compila con strumenti/torrette/compila.sh (bun) in torrette/ufs.js, un solo file con React incluso.
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import Configuratore from "./configuratore-ufs.jsx";

let radice = null, contenitore = null;
window.OBOTorrette = {
  // ogni volta che cambia l'elemento (nuova configurazione, altro progetto) il configuratore riparte da zero
  monta(el, props) {
    if (radice && contenitore !== el) { radice.unmount(); radice = null; }
    if (!radice) { radice = createRoot(el); contenitore = el; }
    radice.render(createElement(Configuratore, props));
  },
};
