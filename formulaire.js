/* ==========================================================================
   formulaire.js — Construction du document « Ordre de mission »
   Les coordonnees proviennent directement du PDF officiel fourni
   (page A4 : 595,32 x 841,92 pt). Aucune n'a ete modifiee : la mise en page
   d'origine est donc strictement conservee, a l'ecran comme a l'impression.
   ========================================================================== */

const PAGE_H = 841.92;

/* Traits du tableau, exprimes en coordonnees PDF [x, y_bas, largeur, hauteur] */
const TRAITS = [
  /* Cartouche d'en-tete */
  [24.36, 824.40, 546.82, 0.48],
  [24.36, 768.48, 546.82, 0.48],
  [134.78, 804.12, 436.40, 0.48],
  [494.14, 788.04, 77.04, 0.48],
  [24.36, 768.48, 0.48, 56.40],
  [134.78, 768.48, 0.48, 56.40],
  [494.14, 768.48, 0.48, 56.40],
  [570.70, 768.48, 0.48, 56.40],
  /* Corps du formulaire */
  [24.00, 752.14, 547.30, 0.48],
  [24.00, 737.26, 547.30, 0.48],
  [23.52, 622.30, 0.48, 114.96],
  [571.30, 622.30, 0.48, 114.96],
  [24.00, 610.90, 278.33, 0.48],
  [302.81, 610.90, 268.49, 0.48],
  [24.00, 595.87, 547.30, 0.48],
  [23.52, 503.95, 0.48, 91.92],
  [571.30, 503.95, 0.48, 91.92],
  [24.00, 492.55, 278.33, 0.48],
  [302.81, 492.55, 268.49, 0.48],
  [24.00, 477.55, 547.30, 0.48],
  [23.52, 385.61, 0.48, 91.94],
  [571.30, 385.61, 0.48, 91.94],
  [23.52, 327.29, 0.48, 43.92],
  [571.30, 327.29, 0.48, 43.92],
  [24.00, 312.41, 278.09, 0.48],
  [302.57, 312.41, 268.73, 0.48],
  [23.52, 221.06, 0.48, 76.94],
  [302.09, 221.06, 0.48, 76.94],
  [571.30, 221.06, 0.48, 76.94],
  [24.00, 206.18, 278.09, 0.48],
  [302.57, 206.18, 268.73, 0.48],
  [24.00, 191.30, 278.09, 0.48],
  [302.57, 191.30, 268.73, 0.48],
  [23.52, 74.52, 0.48, 87.86],
  [302.09, 74.52, 0.48, 87.86],
  [571.30, 74.52, 0.48, 87.86],
  [24.00, 74.04, 278.09, 0.48],
  [302.57, 74.04, 268.73, 0.48],
];

/* Bandeaux bleus : [x, y_bas, largeur, hauteur, libelle] */
const BANDEAUX = [
  [24.00, 737.74, 547.30, 14.40, 'Demandeur'],
  [24.00, 596.35, 547.30, 14.42, 'Objet de la mission'],
  [24.00, 478.03, 547.30, 14.40, 'Moyen de transport'],
  [24.00, 312.89, 278.09, 14.40, 'Visa Chef hiérarchique'],
  [302.45, 312.89, 268.85, 14.40, 'Visa Chef de Département'],
  [24.00, 191.78, 278.09, 14.40, 'Visa Directeur Provincial/Préfectoral'],
  [302.45, 191.78, 268.85, 14.40, 'Visa Directeur Central Concerné'],
];

/* Marges internes des lignes de saisie */
const L_GAUCHE = 30.0;     // debut du libelle
const L_DROITE = 567.2;    // fin de la ligne pointillee
const L_MILIEU = 306.0;    // debut de la 2e colonne
const LARGEUR = L_DROITE - L_GAUCHE;
const LARG_G = L_MILIEU - L_GAUCHE;

const pt = (n) => `${(Math.round(n * 100) / 100)}pt`;

function ech(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Conversion d'une ligne de base PDF vers un « top » CSS */
function hautLigne(base, taille = 9) {
  return PAGE_H - base - 0.78 * taille;
}

/* Une cellule « libelle + ligne pointillee remplie » */
function cellule(libelle, valeur, opts = {}) {
  const cb = opts.caseCochee === undefined ? '' :
    `<span class="om-box${opts.caseCochee ? ' on' : ''}"></span>`;
  const style = opts.largeur ? ` style="flex:0 0 ${pt(opts.largeur)};width:${pt(opts.largeur)}"` : ' style="flex:1 1 auto"';
  const lbl = libelle ? `<span class="om-lbl">${ech(libelle)}</span>` : '';
  return `<div class="om-cell"${style}>${cb}${lbl}` +
    `<span class="om-fill"><span class="om-val">${ech(valeur)}</span></span></div>`;
}

/* Une ligne complete du formulaire */
function ligne(base, cellules) {
  return `<div class="om-row" style="left:${pt(L_GAUCHE)};top:${pt(hautLigne(base))};width:${pt(LARGEUR)}">` +
    cellules.join('') + '</div>';
}

function traits() {
  return TRAITS.map(([x, y, w, h]) =>
    `<div class="om-rule" style="left:${pt(x)};top:${pt(PAGE_H - y - h)};width:${pt(w)};height:${pt(h)}"></div>`
  ).join('');
}

function bandeaux() {
  return BANDEAUX.map(([x, y, w, h, texte]) =>
    `<div class="om-bar" style="left:${pt(x)};top:${pt(PAGE_H - y - h)};width:${pt(w)};height:${pt(h)}">${ech(texte)}</div>`
  ).join('');
}

function enTete(d, logo) {
  const img = logo ? `<img class="om-logo" src="${logo}" alt="">` : '';
  return img +
    `<div class="om-head t1" style="left:135.26pt;top:17.52pt;width:358.88pt;height:19.8pt">${ech(d.entete.titre)}</div>` +
    `<div class="om-head t3" style="left:494.62pt;top:17.52pt;width:76.08pt;height:19.8pt">${ech(d.entete.annee)}</div>` +
    `<div class="om-head t2" style="left:135.26pt;top:37.80pt;width:358.88pt;height:35.16pt">Ordre de mission</div>` +
    `<div class="om-head t3" style="left:494.62pt;top:37.80pt;width:76.08pt;height:15.6pt">Version : ${ech(d.entete.version)}</div>` +
    `<div class="om-head t3" style="left:494.62pt;top:53.88pt;width:76.08pt;height:19.08pt">Page 1 sur 1</div>`;
}

/**
 * Construit le document d'un ordre de mission pour UN agent.
 * @param {object} d  { entete, agent, mission, transport, signature }
 * @param {string} logo  URL (ou data-URI) du logo
 */
function construirePage(d, logo) {
  const a = d.agent || {};
  const m = d.mission || {};
  const t = d.transport || {};
  const s = d.signature || {};

  const parties = [];

  parties.push(traits());
  parties.push(bandeaux());
  parties.push(enTete(d, logo));

  /* --- Demandeur --- */
  parties.push(ligne(716.7, [cellule('Nom et prénom :', a.nom)]));
  parties.push(ligne(693.8, [
    cellule('Matricule :', a.matricule, { largeur: LARG_G }),
    cellule('Fonction :', a.fonction),
  ]));
  parties.push(ligne(670.8, [
    cellule('Direction :', a.direction, { largeur: LARG_G }),
    cellule('Département :', a.departement),
  ]));
  parties.push(ligne(647.9, [
    cellule('Division :', a.division, { largeur: LARG_G }),
    cellule('Service :', a.service),
  ]));
  parties.push(ligne(624.8, [cellule('Province / Préfecture :', a.province)]));

  /* --- Objet de la mission --- */
  parties.push(ligne(575.5, [cellule('Lieu de déplacement :', m.lieu)]));
  parties.push(ligne(552.4, [cellule('Motif du déplacement :', m.motif)]));
  parties.push(ligne(529.5, [
    cellule('Date de départ :', dateFr(m.dateDepart), { largeur: LARG_G }),
    cellule('Heure de départ :', m.heureDepart),
  ]));
  parties.push(ligne(506.5, [
    cellule('Date de retour :', dateFr(m.dateRetour), { largeur: LARG_G }),
    cellule('Heure de retour :', m.heureRetour),
  ]));

  /* --- Moyen de transport --- */
  parties.push(ligne(457.2, [
    cellule('Covoiturage :', t.covoiturageDetail, { caseCochee: !!t.covoiturage }),
  ]));
  parties.push(ligne(434.1, [
    cellule('Véhicule de service :', t.serviceDetail, { caseCochee: !!t.service }),
  ]));
  parties.push(ligne(411.2, [
    cellule('Transport commun :', t.communDetail, { caseCochee: !!t.commun }),
  ]));
  parties.push(
    `<div class="om-row" style="left:${pt(L_GAUCHE)};top:${pt(hautLigne(388.1))};width:${pt(LARGEUR)}">` +
    `<div class="om-cell" style="flex:0 0 ${pt(LARG_G)};width:${pt(LARG_G)}">` +
      `<span class="om-box${t.personnel ? ' on' : ''}"></span>` +
      `<span class="om-lbl">Véhicule personnel :</span>` +
      `<span class="om-lbl">Marque :</span>` +
      `<span class="om-fill"><span class="om-val">${ech(t.marque)}</span></span>` +
    `</div>` +
    cellule('Puissance Fiscale :', t.puissance) +
    `</div>`
  );

  /* --- Fait le / Signature de l'agent --- */
  const fait = decomposerDate(s.faitLe);
  parties.push(
    `<div class="om-row" style="left:111.6pt;top:${pt(hautLigne(373.7))};width:200pt">` +
      `<span class="om-lbl">Fait le :</span>` +
      `<span class="om-fill" style="flex:0 0 26pt;text-align:center"><span class="om-val">${ech(fait.j)}</span></span>` +
      `<span class="om-lbl" style="padding:0 3pt">/</span>` +
      `<span class="om-fill" style="flex:0 0 26pt;text-align:center"><span class="om-val">${ech(fait.m)}</span></span>` +
      `<span class="om-lbl" style="padding:0 3pt">/</span>` +
      `<span class="om-fill" style="flex:0 0 40pt;text-align:center"><span class="om-val">${ech(fait.a)}</span></span>` +
    `</div>`
  );
  parties.push(
    `<div class="om-free" style="left:401.8pt;top:${pt(hautLigne(373.7))}">Signature de l'agent</div>`
  );
  parties.push(
    `<div class="om-row" style="left:109.6pt;top:${pt(hautLigne(340.7))};width:185pt">` +
      `<span class="om-lbl">à :</span>` +
      `<span class="om-fill"><span class="om-val">${ech(s.faitA)}</span></span>` +
    `</div>`
  );
  parties.push(
    `<div class="om-dots" style="left:305.9pt;top:${pt(PAGE_H - 329.8 + 0.6)};width:${pt(L_DROITE - 305.9)}"></div>`
  );

  /* --- Note de bas de page (identique a l'original) --- */
  parties.push(
    `<div class="om-note" style="left:305.9pt;top:${pt(hautLigne(88.1))};width:262pt">` +
    'Prière renseigner si le demandeur relève d’une fonction : Technique, ' +
    'support , clientèle ; ou capital humain</div>'
  );

  return `<div class="om-page">${parties.join('')}</div>`;
}

/* --- Aides de formatage ---------------------------------------------------- */
function dateFr(iso) {
  if (!iso) return '';
  const p = String(iso).split('-');
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function decomposerDate(iso) {
  if (!iso) return { j: '', m: '', a: '' };
  const p = String(iso).split('-');
  if (p.length !== 3) return { j: '', m: '', a: '' };
  return { j: p[2], m: p[1], a: p[0] };
}
