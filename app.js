/* ==========================================================================
   app.js — Logique de l'application « Ordres de mission »
   Fonctionne sur le poste hote comme depuis un telephone ou un autre poste
   du meme reseau (le service local sert l'interface a tous les appareils).
   ========================================================================== */

'use strict';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const PARAMS_DEFAUT = {
  titre: 'Formulaire Direction Provinciale',
  version: '01',
  prefixe: 'OM',
  villeSignature: '',
  regroupe: false,
  defauts: { direction: '', departement: '', division: '', service: '', province: '' }
};

const AGENT_VIDE = () => ({
  nom: '', matricule: '', fonction: '', direction: '', departement: '',
  division: '', service: '', province: ''
});

let etat = { ordres: [], agents: [], parametres: JSON.parse(JSON.stringify(PARAMS_DEFAUT)) };
let environnement = { racinePdf: '', navigateur: true, adresses: [], local: true, pareFeu: false };
let revision = 0;
let courant = null;
let pageApercu = 0;
let zoom = 0.7;
let zoomManuel = false;
let cssFormulaire = '';
let logoDataUri = '';
let vueActive = 'saisie';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const estMobile = () => window.matchMedia('(max-width: 860px)').matches;

/* ==========================================================================
   Pictogrammes de navigation
   ========================================================================== */
const ICONES = {
  plume: '<path d="M4 20c6-1 9-4 11-8M20 4c0 7-4 12-11 13l-3 1 1-3C8 8 13 4 20 4z"/>',
  dossier: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  agents: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M18 20c0-2-1-3.5-2.5-4.3"/>',
  reseau: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'
};

function poserIcones() {
  $$('.ic').forEach(i => {
    const d = ICONES[i.dataset.ic];
    if (!d) return;
    i.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
      stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  });
}

/* ==========================================================================
   Communication avec le service
   ========================================================================== */
async function api(chemin, corps) {
  const opt = corps === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) };
  const r = await fetch(chemin, opt);
  if (!r.ok) {
    let msg = 'Erreur ' + r.status;
    try { const j = await r.json(); if (j && j.message) msg = j.message; } catch (e) {}
    throw new Error(msg);
  }
  return r.json();
}

function signalerConnexion(ok) {
  const el = $('#etatServeur');
  el.classList.toggle('hors', !ok);
  el.lastChild.nodeValue = ok ? 'Connecté' : 'Hors ligne';
  el.title = ok ? 'Service joignable' : 'Service injoignable : les modifications ne sont pas enregistrées';
}

/* --- Enregistrement avec detection des modifications concurrentes --------- */
async function enregistrerEtat(estUnReessai) {
  let r;
  try {
    r = await fetch('/api/etat?revision=' + revision, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(etat)
    });
  } catch (e) {
    signalerConnexion(false);
    throw new Error('Service injoignable.');
  }

  if (r.status === 409) {
    // Un autre appareil a modifie les donnees entre-temps : on fusionne.
    const d = await r.json();
    fusionner(d.etat || {});
    revision = d.revision;
    if (!estUnReessai) return enregistrerEtat(true);
    throw new Error('Modifications concurrentes : reessayez.');
  }
  if (!r.ok) { signalerConnexion(false); throw new Error('Erreur ' + r.status); }

  const d = await r.json();
  revision = d.revision;
  signalerConnexion(true);
}

function fusionner(distant) {
  const ordresDistants = Array.isArray(distant.ordres) ? distant.ordres : [];
  const agentsDistants = Array.isArray(distant.agents) ? distant.agents : [];

  const parId = new Map(ordresDistants.map(o => [o.id, o]));
  etat.ordres.forEach(local => {
    const dist = parId.get(local.id);
    if (!dist) { parId.set(local.id, local); return; }
    const tl = new Date(local.modifieLe || local.creeLe || 0).getTime();
    const td = new Date(dist.modifieLe || dist.creeLe || 0).getTime();
    if (tl >= td) parId.set(local.id, local);
  });
  etat.ordres = Array.from(parId.values())
    .sort((a, b) => new Date(b.creeLe || 0) - new Date(a.creeLe || 0));

  const parNom = new Map(agentsDistants.map(a => [(a.nom || '').toLowerCase(), a]));
  etat.agents.forEach(a => parNom.set((a.nom || '').toLowerCase(), a));
  etat.agents = Array.from(parNom.values()).sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
}

function appliquerEtat(e) {
  etat.ordres = Array.isArray(e.ordres) ? e.ordres : [];
  etat.agents = Array.isArray(e.agents) ? e.agents : [];
  etat.parametres = Object.assign(JSON.parse(JSON.stringify(PARAMS_DEFAUT)), e.parametres || {});
  etat.parametres.defauts = Object.assign({}, PARAMS_DEFAUT.defauts, (e.parametres || {}).defauts || {});
}

/* --- Synchronisation periodique entre appareils --------------------------- */
async function synchroniser(silencieux) {
  try {
    const p = await api('/api/ping');
    signalerConnexion(true);
    if (p.revision === revision) return false;
    const d = await api('/api/etat');
    revision = d.revision;
    appliquerEtat(d.etat || {});
    majListes();
    if (vueActive === 'archives') dessinerArchives();
    if (vueActive === 'agents') dessinerRepertoire();
    if (!silencieux) toast('Données actualisées depuis un autre appareil.', '', 'Synchronisation');
    return true;
  } catch (e) {
    signalerConnexion(false);
    return false;
  }
}

let sauvegardeEnAttente = null;
function planifierSauvegarde() {
  clearTimeout(sauvegardeEnAttente);
  sauvegardeEnAttente = setTimeout(() => enregistrerEtat().catch(() => {}), 400);
}

/* ==========================================================================
   Notifications
   ========================================================================== */
function toast(texte, type = '', titre = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + type;
  d.innerHTML = (titre ? `<b>${echapper(titre)}</b>&nbsp;` : '') + echapper(texte);
  $('#toasts').appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; d.style.transform = 'translateY(6px)'; }, 3600);
  setTimeout(() => d.remove(), 4000);
}

function echapper(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function voile(actif, texte) {
  const v = $('#voile');
  if (texte) $('#voileTexte').textContent = texte;
  v.hidden = !actif;
}

function confirmer(titre, texte, libelle = 'Confirmer') {
  return new Promise(res => {
    const m = $('#modale');
    $('#modaleTitre').textContent = titre;
    $('#modaleTexte').textContent = texte;
    $('#modaleOk').textContent = libelle;
    m.hidden = false;
    const fin = (v) => {
      m.hidden = true;
      $('#modaleOk').removeEventListener('click', ok);
      $('#modaleAnnuler').removeEventListener('click', non);
      res(v);
    };
    const ok = () => fin(true);
    const non = () => fin(false);
    $('#modaleOk').addEventListener('click', ok);
    $('#modaleAnnuler').addEventListener('click', non);
  });
}

/* ==========================================================================
   Aides
   ========================================================================== */
const uid = () => 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function moisDe(ordre) {
  const iso = (ordre.mission && ordre.mission.dateDepart) || ordre.creeLe || aujourdhui();
  const d = String(iso).slice(0, 10).split('-');
  return { annee: d[0], mois: d[1] || '01' };
}

function nomDossierMois(mois) {
  return `${mois} - ${MOIS[parseInt(mois, 10) - 1] || ''}`.trim();
}

function dateFrCourt(iso) {
  if (!iso) return '—';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function nettoyerFichier(nom) {
  return String(nom || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

const lienPdf = (chemin) => '/api/telecharger?f=' + encodeURIComponent(chemin);

/* ==========================================================================
   Modele de l'ordre en cours
   ========================================================================== */
function ordreVierge() {
  const p = etat.parametres;
  const a = AGENT_VIDE();
  Object.assign(a, p.defauts);
  return {
    id: uid(),
    numero: '',
    creeLe: new Date().toISOString(),
    modifieLe: null,
    agents: [a],
    mission: { lieu: '', motif: '', dateDepart: aujourdhui(), heureDepart: '', dateRetour: aujourdhui(), heureRetour: '' },
    transport: {
      covoiturage: false, covoiturageDetail: '',
      service: false, serviceDetail: '',
      commun: false, communDetail: '',
      personnel: false, marque: '', puissance: ''
    },
    signature: { faitLe: aujourdhui(), faitA: p.villeSignature || '' },
    entete: { titre: p.titre, version: p.version, annee: String(new Date().getFullYear()) },
    fichiers: []
  };
}

function numeroterSiBesoin(ordre) {
  if (ordre.numero) return ordre.numero;
  const { annee, mois } = moisDe(ordre);
  const prefixe = etat.parametres.prefixe || 'OM';
  const racine = `${prefixe}-${annee}-${mois}-`;
  let max = 0;
  etat.ordres.forEach(o => {
    if (o.numero && o.numero.startsWith(racine)) {
      const n = parseInt(o.numero.slice(racine.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  ordre.numero = racine + String(max + 1).padStart(3, '0');
  return ordre.numero;
}

/* ==========================================================================
   Vue « Saisie »
   ========================================================================== */
function creerFicheAgent(agent, index) {
  const n = $('#gabaritAgent').content.firstElementChild.cloneNode(true);
  n.querySelector('.agent-index').textContent = 'Agent ' + (index + 1);
  $$('input[data-c]', n).forEach(inp => {
    inp.value = agent[inp.dataset.c] || '';
    inp.addEventListener('input', () => {
      const i = indexFiche(n);
      if (i < 0) return;
      courant.agents[i][inp.dataset.c] = inp.value;
      marquerModifie();
      majApercuDifferee();
    });
  });

  const champNom = n.querySelector('input[data-c="nom"]');
  champNom.addEventListener('change', () => {
    const trouve = etat.agents.find(a => a.nom.toLowerCase() === champNom.value.trim().toLowerCase());
    if (!trouve) return;
    const i = indexFiche(n);
    if (i < 0) return;
    Object.keys(AGENT_VIDE()).forEach(k => {
      if (k === 'nom') return;
      if (trouve[k]) {
        courant.agents[i][k] = trouve[k];
        const c = n.querySelector(`input[data-c="${k}"]`);
        if (c) c.value = trouve[k];
      }
    });
    marquerModifie();
    majApercu();
    toast('Informations reprises du répertoire.', 'succes', trouve.nom);
  });

  n.querySelector('.js-suppr').addEventListener('click', () => {
    const i = indexFiche(n);
    if (i < 0 || courant.agents.length <= 1) return;
    courant.agents.splice(i, 1);
    if (pageApercu >= courant.agents.length) pageApercu = courant.agents.length - 1;
    marquerModifie();
    dessinerAgents();
    majApercu();
  });

  n.querySelector('.js-copier').addEventListener('click', () => {
    const i = indexFiche(n);
    if (i <= 0) return;
    const src = courant.agents[0];
    ['direction', 'departement', 'division', 'service', 'province'].forEach(k => {
      courant.agents[i][k] = src[k] || '';
      const c = n.querySelector(`input[data-c="${k}"]`);
      if (c) c.value = src[k] || '';
    });
    marquerModifie();
    majApercu();
  });

  n.querySelector('.js-annuaire').addEventListener('click', () => {
    const i = indexFiche(n);
    if (i < 0) return;
    ajouterAuRepertoire(courant.agents[i]);
  });

  return n;
}

function indexFiche(noeud) {
  return $$('#listeAgents > .agent').indexOf(noeud);
}

function dessinerAgents() {
  const liste = $('#listeAgents');
  liste.innerHTML = '';
  courant.agents.forEach((a, i) => liste.appendChild(creerFicheAgent(a, i)));
  $('#nbAgents').textContent = courant.agents.length;
  dessinerPages();
}

function ajouterAgent() {
  const modele = courant.agents[0] || AGENT_VIDE();
  const a = AGENT_VIDE();
  ['direction', 'departement', 'division', 'service', 'province'].forEach(k => { a[k] = modele[k] || ''; });
  courant.agents.push(a);
  pageApercu = courant.agents.length - 1;
  marquerModifie();
  dessinerAgents();
  majApercu();
  const fiches = $$('#listeAgents > .agent');
  const dernier = fiches[fiches.length - 1];
  dernier.classList.add('pulse');
  dernier.scrollIntoView({ behavior: 'smooth', block: 'center' });
  dernier.querySelector('input[data-c="nom"]').focus();
}

const LIAISONS = [
  ['#m_lieu', 'mission', 'lieu'], ['#m_motif', 'mission', 'motif'],
  ['#m_dateDepart', 'mission', 'dateDepart'], ['#m_heureDepart', 'mission', 'heureDepart'],
  ['#m_dateRetour', 'mission', 'dateRetour'], ['#m_heureRetour', 'mission', 'heureRetour'],
  ['#t_covoiturage', 'transport', 'covoiturage'], ['#t_covoiturageDetail', 'transport', 'covoiturageDetail'],
  ['#t_service', 'transport', 'service'], ['#t_serviceDetail', 'transport', 'serviceDetail'],
  ['#t_commun', 'transport', 'commun'], ['#t_communDetail', 'transport', 'communDetail'],
  ['#t_personnel', 'transport', 'personnel'], ['#t_marque', 'transport', 'marque'],
  ['#t_puissance', 'transport', 'puissance'],
  ['#s_faitLe', 'signature', 'faitLe'], ['#s_faitA', 'signature', 'faitA'],
  ['#e_annee', 'entete', 'annee'], ['#e_version', 'entete', 'version']
];

function brancherChamps() {
  LIAISONS.forEach(([sel, groupe, cle]) => {
    const el = $(sel);
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      courant[groupe][cle] = el.type === 'checkbox' ? el.checked : el.value;
      marquerModifie();
      majApercuDifferee();
    });
  });
}

function remplirChamps() {
  LIAISONS.forEach(([sel, groupe, cle]) => {
    const el = $(sel);
    const v = courant[groupe][cle];
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
  });
}

function chargerOrdre(ordre) {
  courant = JSON.parse(JSON.stringify(ordre));
  pageApercu = 0;
  remplirChamps();
  dessinerAgents();
  majApercu();
  const existe = etat.ordres.some(o => o.id === courant.id);
  $('#titreSaisie').textContent = existe ? 'Modifier l’ordre ' + (courant.numero || '') : 'Nouvel ordre de mission';
  $('#sousTitreSaisie').textContent = existe
    ? 'Enregistré le ' + new Date(courant.modifieLe || courant.creeLe).toLocaleString('fr-FR')
    : 'Renseignez les informations : l’aperçu se met à jour en temps réel.';
  $('#infoEnregistrement').textContent = existe ? 'Ordre enregistré' : 'Brouillon non enregistré';
  allerVue('saisie');
}

function marquerModifie() {
  $('#infoEnregistrement').textContent = 'Modifications non enregistrées';
  try { localStorage.setItem('om-brouillon', JSON.stringify(courant)); } catch (e) {}
}

/* ==========================================================================
   Apercu A4
   ========================================================================== */
function donneesPage(index) {
  return {
    entete: courant.entete,
    agent: courant.agents[index] || AGENT_VIDE(),
    mission: courant.mission,
    transport: courant.transport,
    signature: courant.signature
  };
}

let apercuDiffere = null;
function majApercuDifferee() {
  clearTimeout(apercuDiffere);
  apercuDiffere = setTimeout(majApercu, 120);
}

function majApercu() {
  if (!courant) return;
  if (pageApercu >= courant.agents.length) pageApercu = 0;
  const cible = $('#apercuEchelle');
  cible.innerHTML = construirePage(donneesPage(pageApercu), 'logo.png');
  zoomAuto();
  appliquerZoom();
  dessinerPages();
}

function zoomAuto() {
  if (zoomManuel) return;
  const dispo = $('#apercuCorps').clientWidth - 26;
  if (dispo < 120) return;
  zoom = Math.max(0.3, Math.min(1, Math.round((dispo / 793.7) * 100) / 100));
  appliquerZoom();
}

function appliquerZoom() {
  const el = $('#apercuEchelle');
  el.style.transform = `scale(${zoom})`;
  $('#zoomVal').textContent = Math.round(zoom * 100) + ' %';
  el.style.marginRight = ((zoom - 1) * el.offsetWidth) + 'px';
  el.style.marginBottom = ((zoom - 1) * el.scrollHeight) + 'px';
}

function ouvrirApercu() {
  document.body.classList.add('apercu-ouvert');
  zoomManuel = false;
  setTimeout(() => { zoomAuto(); appliquerZoom(); }, 60);
}
function fermerApercu() {
  document.body.classList.remove('apercu-ouvert');
}

/* Impression directe : toutes les pages (un agent = une page A4) */
function imprimer() {
  if (!courant) return;
  const cible = $('#apercuEchelle');
  const sauvegarde = cible.innerHTML;
  cible.innerHTML = courant.agents.map((a, i) => construirePage(donneesPage(i), 'logo.png')).join('');
  const restaurer = () => {
    cible.innerHTML = sauvegarde;
    appliquerZoom();
    window.removeEventListener('afterprint', restaurer);
  };
  window.addEventListener('afterprint', restaurer);
  setTimeout(() => window.print(), 60);
}

function dessinerPages() {
  const c = $('#pagesApercu');
  if (!courant) return;
  if (courant.agents.length <= 1) { c.innerHTML = ''; return; }
  c.innerHTML = courant.agents.map((a, i) =>
    `<button data-i="${i}" class="${i === pageApercu ? 'actif' : ''}">${echapper(a.nom || 'Agent ' + (i + 1))}</button>`
  ).join('');
  $$('button', c).forEach(b => b.addEventListener('click', () => {
    pageApercu = +b.dataset.i;
    majApercu();
  }));
}

/* ==========================================================================
   Enregistrement et generation des PDF
   ========================================================================== */
function validerSaisie() {
  const manques = [];
  courant.agents.forEach((a, i) => {
    if (!a.nom.trim()) manques.push('le nom de l’agent ' + (i + 1));
  });
  if (!courant.mission.lieu.trim()) manques.push('le lieu de déplacement');
  if (!courant.mission.motif.trim()) manques.push('le motif du déplacement');
  return manques;
}

async function enregistrerOrdre(silencieux) {
  const manques = validerSaisie();
  if (manques.length) {
    toast('Veuillez renseigner ' + manques.join(', ') + '.', 'erreur', 'Champs manquants');
    return false;
  }

  // Pour un nouvel ordre, on se resynchronise afin d'eviter deux fois le
  // meme numero si un autre appareil vient d'en creer un.
  if (!courant.numero) { await synchroniser(true); }

  numeroterSiBesoin(courant);
  courant.modifieLe = new Date().toISOString();

  const i = etat.ordres.findIndex(o => o.id === courant.id);
  const copie = JSON.parse(JSON.stringify(courant));
  if (i >= 0) etat.ordres[i] = copie; else etat.ordres.unshift(copie);

  courant.agents.forEach(a => { if (a.nom.trim()) memoriserAgent(a); });

  try {
    await enregistrerEtat();
    try { localStorage.removeItem('om-brouillon'); } catch (e) {}
    $('#infoEnregistrement').textContent = 'Ordre ' + courant.numero + ' enregistré';
    $('#titreSaisie').textContent = 'Modifier l’ordre ' + courant.numero;
    majListes();
    dessinerArchives();
    if (!silencieux) toast('Ordre de mission ' + courant.numero + ' enregistré.', 'succes', 'Enregistré');
    return true;
  } catch (e) {
    toast(e.message, 'erreur', 'Enregistrement impossible');
    return false;
  }
}

function documentImprimable(pages) {
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
    '<title>Ordre de mission</title><style>' + cssFormulaire +
    '\nhtml,body{margin:0;padding:0;background:#fff}</style></head><body>' +
    pages + '</body></html>';
}

async function genererPdf() {
  if (!(await enregistrerOrdre(true))) return;
  if (!cssFormulaire) { toast('Feuille de style indisponible.', 'erreur'); return; }
  if (!environnement.navigateur) {
    toast('Aucun navigateur compatible sur le poste hôte : lancez Diagnostic.bat.', 'erreur', 'PDF impossible');
    return;
  }

  const { annee, mois } = moisDe(courant);
  const documents = [];

  if (etat.parametres.regroupe && courant.agents.length > 1) {
    const pages = courant.agents.map((a, i) => construirePage(donneesPage(i), logoDataUri)).join('');
    documents.push({
      nom: nettoyerFichier(`${courant.numero} - ${courant.agents.length} agents`),
      html: documentImprimable(pages)
    });
  } else {
    courant.agents.forEach((a, i) => {
      documents.push({
        nom: nettoyerFichier(`${courant.numero}${courant.agents.length > 1 ? '-' + (i + 1) : ''} - ${a.nom || 'Agent ' + (i + 1)}`),
        html: documentImprimable(construirePage(donneesPage(i), logoDataUri))
      });
    });
  }

  voile(true, documents.length > 1
    ? `Génération de ${documents.length} ordres de mission…`
    : 'Génération du PDF…');

  const anciens = (courant.fichiers || []).map(f => f.chemin);
  if (anciens.length) {
    try { await api('/api/supprimer-fichier', { fichiers: anciens }); } catch (e) {}
  }

  try {
    const r = await api('/api/pdf', { dossier: [annee, nomDossierMois(mois)], documents });
    const ok = (r.fichiers || []).filter(f => f.ok);
    const fichiers = ok.map(f => ({ chemin: f.fichier, nom: f.nom }));
    courant.fichiers = fichiers;
    const idx = etat.ordres.findIndex(o => o.id === courant.id);
    if (idx >= 0) etat.ordres[idx].fichiers = fichiers;
    await enregistrerEtat();
    dessinerArchives();
    voile(false);
    if (!ok.length) {
      toast('Aucun PDF n’a pu être créé.', 'erreur', 'Échec');
    } else {
      toast(`${ok.length} PDF classé${ok.length > 1 ? 's' : ''} dans ${annee} › ${nomDossierMois(mois)}.`,
        'succes', 'PDF généré' + (ok.length > 1 ? 's' : ''));
    }
  } catch (e) {
    voile(false);
    toast(e.message, 'erreur', 'Génération impossible');
  }
}

/* ==========================================================================
   Repertoire des agents
   ========================================================================== */
function memoriserAgent(a) {
  const nom = (a.nom || '').trim();
  if (!nom) return;
  const i = etat.agents.findIndex(x => (x.nom || '').toLowerCase() === nom.toLowerCase());
  const fiche = i >= 0 ? etat.agents[i] : AGENT_VIDE();
  Object.keys(AGENT_VIDE()).forEach(k => { if ((a[k] || '').trim()) fiche[k] = a[k].trim(); });
  fiche.nom = nom;
  if (i < 0) etat.agents.push(fiche);
  etat.agents.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
}

function ajouterAuRepertoire(a) {
  if (!a.nom.trim()) { toast('Renseignez d’abord le nom de l’agent.', 'erreur'); return; }
  memoriserAgent(a);
  planifierSauvegarde();
  majListes();
  dessinerRepertoire();
  toast(a.nom + ' ajouté au répertoire.', 'succes');
}

const COLONNES_AGENT = [
  ['nom', 'Nom et prénom'], ['matricule', 'Matricule'], ['fonction', 'Fonction'],
  ['direction', 'Direction'], ['departement', 'Département'], ['division', 'Division'],
  ['service', 'Service'], ['province', 'Province / Préfecture']
];

function dessinerRepertoire() {
  const c = $('#tableAgents');
  if (!etat.agents.length) {
    c.innerHTML = '<div class="vide"><b>Répertoire vide</b>Les agents saisis dans un ordre de mission y sont ajoutés automatiquement.</div>';
    return;
  }
  c.innerHTML =
    '<table><thead><tr>' + COLONNES_AGENT.map(x => `<th>${x[1]}</th>`).join('') +
    '<th></th></tr></thead><tbody>' +
    etat.agents.map((a, i) =>
      '<tr>' + COLONNES_AGENT.map(x =>
        `<td data-libelle="${x[1]}"><input type="text" data-i="${i}" data-c="${x[0]}" value="${echapper(a[x[0]])}"></td>`
      ).join('') +
      `<td class="actions-cell"><button class="btn-mini danger" data-suppr="${i}">Supprimer</button></td></tr>`
    ).join('') + '</tbody></table>';

  $$('input[data-c]', c).forEach(inp => inp.addEventListener('change', () => {
    etat.agents[+inp.dataset.i][inp.dataset.c] = inp.value;
    planifierSauvegarde();
    majListes();
  }));
  $$('[data-suppr]', c).forEach(b => b.addEventListener('click', async () => {
    const a = etat.agents[+b.dataset.suppr];
    if (await confirmer('Supprimer l’agent',
        `Retirer ${a.nom} du répertoire ? Les ordres de mission déjà enregistrés ne sont pas modifiés.`, 'Supprimer')) {
      etat.agents.splice(+b.dataset.suppr, 1);
      planifierSauvegarde();
      dessinerRepertoire();
      majListes();
    }
  }));
}

/* ==========================================================================
   Archives
   ========================================================================== */
function ordresFiltres() {
  const q = $('#recherche').value.trim().toLowerCase();
  const fa = $('#filtreAnnee').value;
  const fm = $('#filtreMois').value;
  return etat.ordres.filter(o => {
    const { annee, mois } = moisDe(o);
    if (fa && annee !== fa) return false;
    if (fm && mois !== fm) return false;
    if (!q) return true;
    const t = [o.numero, o.mission.lieu, o.mission.motif,
      ...o.agents.map(a => `${a.nom} ${a.matricule} ${a.fonction} ${a.service}`)].join(' ').toLowerCase();
    return t.includes(q);
  });
}

function dessinerArchives() {
  majFiltres();
  const liste = ordresFiltres();
  const c = $('#listeArchives');

  const nbAgents = etat.ordres.reduce((s, o) => s + o.agents.length, 0);
  const nbPdf = etat.ordres.reduce((s, o) => s + (o.fichiers || []).length, 0);
  const moisActifs = new Set(etat.ordres.map(o => { const m = moisDe(o); return m.annee + m.mois; })).size;
  $('#statsArchives').innerHTML = [
    ['Ordres enregistrés', etat.ordres.length],
    ['Agents concernés', nbAgents],
    ['PDF générés', nbPdf],
    ['Mois actifs', moisActifs]
  ].map(([t, v]) => `<div class="stat"><b>${v}</b><span>${t}</span></div>`).join('');

  if (!liste.length) {
    c.innerHTML = '<div class="vide"><b>Aucun ordre de mission</b>' +
      (etat.ordres.length ? 'Aucun résultat pour cette recherche.' : 'Créez votre premier ordre depuis l’onglet « Nouvel ordre ».') +
      '</div>';
    return;
  }

  const groupes = new Map();
  liste.forEach(o => {
    const { annee, mois } = moisDe(o);
    const cle = annee + '-' + mois;
    if (!groupes.has(cle)) groupes.set(cle, { annee, mois, ordres: [] });
    groupes.get(cle).ordres.push(o);
  });
  const cles = Array.from(groupes.keys()).sort().reverse();

  let html = '';
  let anneeCourante = '';
  cles.forEach((cle, idx) => {
    const g = groupes.get(cle);
    if (g.annee !== anneeCourante) {
      anneeCourante = g.annee;
      html += `<div class="annee-titre">Année ${g.annee}</div>`;
    }
    const total = g.ordres.reduce((s, o) => s + o.agents.length, 0);
    const boutonDossier = environnement.local
      ? `<button class="btn-mini" data-dossier="${echapper(g.annee + '\\' + nomDossierMois(g.mois))}">Ouvrir le dossier</button>`
      : '';
    html += `<div class="mois${idx === 0 ? ' ouvert' : ''}" data-cle="${cle}">
      <div class="mois-tete"><span class="fleche">&#9654;</span>
        <h4>${nomDossierMois(g.mois)}</h4>
        <span class="pastille">${g.ordres.length} ordre${g.ordres.length > 1 ? 's' : ''} &middot; ${total} agent${total > 1 ? 's' : ''}</span>
        ${boutonDossier}
      </div>
      <div class="mois-corps">${g.ordres.slice().sort((a, b) => (b.numero || '').localeCompare(a.numero || '')).map(ficheOrdre).join('')}</div>
    </div>`;
  });
  c.innerHTML = html;

  $$('.mois-tete', c).forEach(t => t.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    t.parentElement.classList.toggle('ouvert');
  }));
  $$('[data-dossier]', c).forEach(b => b.addEventListener('click', () =>
    api('/api/ouvrir', { chemin: environnement.racinePdf + '\\' + b.dataset.dossier })
      .catch(() => toast('Ce dossier n’existe pas encore.', 'erreur'))));
  $$('[data-action]', c).forEach(b => b.addEventListener('click', () => actionOrdre(b.dataset.action, b.dataset.id)));
}

function ficheOrdre(o) {
  const agents = o.agents.map(a => `<span class="jeton">${echapper(a.nom || 'Sans nom')}</span>`).join('');
  const pdfs = (o.fichiers || []).map(f =>
    `<a class="jeton pdf" href="${echapper(lienPdf(f.chemin))}" target="_blank" rel="noopener"
        title="Ouvrir le PDF">&#128196; ${echapper(f.nom)}</a>`).join('');
  return `<div class="ordre">
    <div class="ordre-num">${echapper(o.numero || '—')}</div>
    <div class="ordre-corps">
      <h5>${echapper(o.mission.motif || 'Sans motif')}</h5>
      <div class="ordre-meta">
        <span>&#128205; ${echapper(o.mission.lieu || '—')}</span>
        <span>Départ : ${dateFrCourt(o.mission.dateDepart)}${o.mission.heureDepart ? ' à ' + echapper(o.mission.heureDepart) : ''}</span>
        <span>Retour : ${dateFrCourt(o.mission.dateRetour)}${o.mission.heureRetour ? ' à ' + echapper(o.mission.heureRetour) : ''}</span>
      </div>
      <div class="jetons">${agents}${pdfs}</div>
    </div>
    <div class="ordre-actions">
      <button class="btn-mini" data-action="modifier" data-id="${o.id}">Modifier</button>
      <button class="btn-mini" data-action="dupliquer" data-id="${o.id}">Dupliquer</button>
      <button class="btn-mini" data-action="pdf" data-id="${o.id}">${(o.fichiers || []).length ? 'Regénérer' : 'Générer'} PDF</button>
      <button class="btn-mini danger" data-action="supprimer" data-id="${o.id}">Supprimer</button>
    </div>
  </div>`;
}

async function actionOrdre(action, id) {
  const o = etat.ordres.find(x => x.id === id);
  if (!o) return;
  if (action === 'modifier') { chargerOrdre(o); return; }
  if (action === 'dupliquer') {
    const copie = JSON.parse(JSON.stringify(o));
    copie.id = uid();
    copie.numero = '';
    copie.creeLe = new Date().toISOString();
    copie.modifieLe = null;
    copie.fichiers = [];
    chargerOrdre(copie);
    toast('Copie prête à être modifiée.', 'succes', 'Ordre dupliqué');
    return;
  }
  if (action === 'pdf') { chargerOrdre(o); await genererPdf(); return; }
  if (action === 'supprimer') {
    const nb = (o.fichiers || []).length;
    const ok = await confirmer('Supprimer l’ordre de mission',
      `L’ordre ${o.numero} sera retiré des archives${nb ? ` et ${nb} fichier${nb > 1 ? 's' : ''} PDF supprimé${nb > 1 ? 's' : ''}` : ''}. Cette action est définitive.`,
      'Supprimer');
    if (!ok) return;
    if (nb) {
      try { await api('/api/supprimer-fichier', { fichiers: o.fichiers.map(f => f.chemin) }); } catch (e) {}
    }
    etat.ordres = etat.ordres.filter(x => x.id !== id);
    try {
      await enregistrerEtat();
      dessinerArchives();
      toast('Ordre de mission supprimé.', 'succes');
    } catch (e) {
      toast(e.message, 'erreur', 'Suppression impossible');
    }
  }
}

function majFiltres() {
  const annees = Array.from(new Set(etat.ordres.map(o => moisDe(o).annee))).sort().reverse();
  const sel = $('#filtreAnnee');
  const v = sel.value;
  sel.innerHTML = '<option value="">Toutes les années</option>' +
    annees.map(a => `<option value="${a}">${a}</option>`).join('');
  sel.value = annees.includes(v) ? v : '';

  const selM = $('#filtreMois');
  if (selM.options.length <= 1) {
    selM.innerHTML = '<option value="">Tous les mois</option>' +
      MOIS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');
  }
}

/* ==========================================================================
   Vue « Reseau »
   ========================================================================== */
function dessinerReseau() {
  const adresses = environnement.adresses || [];
  const bandeau = $('#reseauEtat');

  if (!environnement.local) {
    bandeau.innerHTML = `<div class="bandeau ok"><span class="pastille-etat"></span><div>
      <b>Vous utilisez l’application à distance</b>
      Connecté au poste <code>${echapper(environnement.machine || '')}</code>. Les ordres de mission
      et les PDF sont enregistrés sur ce poste.</div></div>`;
  } else if (!adresses.length) {
    bandeau.innerHTML = `<div class="bandeau alerte"><span class="pastille-etat"></span><div>
      <b>Aucun réseau détecté</b>
      Ce poste ne semble connecté à aucun réseau : l’accès depuis un téléphone
      n’est pas possible pour le moment.</div></div>`;
  } else if (!environnement.pareFeu || environnement.reseauPublic) {
    const raisons = [];
    if (!environnement.pareFeu) raisons.push('le pare-feu de Windows bloque encore les connexions entrantes');
    if (environnement.reseauPublic) raisons.push('le réseau Wi-Fi est déclaré <b>Public</b>, ce qui bloque tout accès entrant');
    bandeau.innerHTML = `<div class="bandeau alerte"><span class="pastille-etat"></span><div>
      <b>Une autorisation est encore nécessaire</b>
      Actuellement, ${raisons.join(' et ')}.<br>
      Lancez une seule fois <code>Autoriser l’accès réseau.bat</code> : une demande
      administrateur s’affichera, et le script proposera aussi de corriger le profil réseau.
      Relancez ensuite l’application.</div></div>`;
  } else {
    bandeau.innerHTML = `<div class="bandeau ok"><span class="pastille-etat"></span><div>
      <b>Accès réseau actif</b>
      Les téléphones et postes du même réseau Wi-Fi peuvent ouvrir l’adresse ci-dessous.</div></div>`;
  }

  const principale = adresses[0] || environnement.urlLocale || location.origin + '/';
  const qr = $('#qrCode');
  try {
    qr.innerHTML = qrSvg(principale, { marge: 2 });
  } catch (e) {
    qr.innerHTML = '<div class="vide" style="padding:20px;font-size:12px">QR indisponible</div>';
  }

  $('#reseauAdresses').innerHTML = (adresses.length ? adresses : [principale]).map(a =>
    `<div class="adresse"><span>${echapper(a)}</span>
      <button class="btn-mini" data-copier="${echapper(a)}">Copier</button></div>`).join('');

  $$('#reseauAdresses [data-copier]').forEach(b => b.addEventListener('click', async () => {
    const texte = b.dataset.copier;
    try {
      await navigator.clipboard.writeText(texte);
      toast('Adresse copiée.', 'succes');
    } catch (e) {
      const z = document.createElement('textarea');
      z.value = texte; document.body.appendChild(z); z.select();
      try { document.execCommand('copy'); toast('Adresse copiée.', 'succes'); }
      catch (e2) { toast('Copie impossible : notez l’adresse manuellement.', 'erreur'); }
      z.remove();
    }
  }));

  const lignes = [
    ['Poste hôte', environnement.machine || '—'],
    ['Port', environnement.port || '—'],
    ['Accès courant', environnement.local ? 'Local (ce poste)' : 'Distant'],
    ['Pare-feu autorisé', environnement.pareFeu ? 'Oui' : 'Non'],
    ['Profil réseau', environnement.reseauPublic ? 'Public (bloque les accès)' : 'Privé ou domaine'],
    ['Génération PDF', environnement.navigateur ? 'Disponible' : 'Indisponible'],
    ['Dossier des PDF', environnement.racinePdf || '—']
  ];
  $('#reseauInfos').innerHTML = lignes.map(([k, v]) =>
    `<div><span class="cle">${echapper(k)}</span><span class="val">${echapper(v)}</span></div>`).join('');
}

/* ==========================================================================
   Listes de suggestions
   ========================================================================== */
function majListes() {
  const remplir = (sel, valeurs) => {
    $(sel).innerHTML = Array.from(new Set(valeurs.filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map(v => `<option value="${echapper(v)}"></option>`).join('');
  };
  remplir('#l_noms', etat.agents.map(a => a.nom));
  remplir('#l_fonctions', etat.agents.map(a => a.fonction));
  remplir('#l_lieux', etat.ordres.map(o => o.mission.lieu));
  remplir('#l_motifs', etat.ordres.map(o => o.mission.motif));
  remplir('#l_villes', etat.ordres.map(o => o.signature.faitA).concat([etat.parametres.villeSignature]));
}

/* ==========================================================================
   Parametres
   ========================================================================== */
const CHAMPS_PARAMS = [
  ['#p_direction', 'defauts.direction'], ['#p_departement', 'defauts.departement'],
  ['#p_division', 'defauts.division'], ['#p_service', 'defauts.service'],
  ['#p_province', 'defauts.province'], ['#p_titre', 'titre'], ['#p_version', 'version'],
  ['#p_ville', 'villeSignature'], ['#p_prefixe', 'prefixe']
];

function lireParam(chemin) {
  return chemin.split('.').reduce((o, k) => (o || {})[k], etat.parametres) || '';
}
function ecrireParam(chemin, v) {
  const p = chemin.split('.');
  let o = etat.parametres;
  while (p.length > 1) { o = o[p.shift()]; }
  o[p[0]] = v;
}

function remplirParametres() {
  CHAMPS_PARAMS.forEach(([sel, c]) => { $(sel).value = lireParam(c); });
  $('#p_regroupe').checked = !!etat.parametres.regroupe;
  $('#p_dossier').value = environnement.racinePdf || '';
}

async function enregistrerParametres() {
  CHAMPS_PARAMS.forEach(([sel, c]) => ecrireParam(c, $(sel).value.trim()));
  etat.parametres.regroupe = $('#p_regroupe').checked;
  try {
    await enregistrerEtat();
    majListes();
    toast('Paramètres enregistrés.', 'succes');
  } catch (e) {
    toast(e.message, 'erreur', 'Enregistrement impossible');
  }
}

/* ==========================================================================
   Navigation
   ========================================================================== */
function allerVue(nom) {
  vueActive = nom;
  fermerApercu();
  $$('.vue').forEach(v => v.classList.toggle('active', v.id === 'vue-' + nom));
  $$('.onglet').forEach(o => o.classList.toggle('actif', o.dataset.vue === nom));
  if (nom === 'archives') dessinerArchives();
  if (nom === 'agents') dessinerRepertoire();
  if (nom === 'reseau') dessinerReseau();
  if (nom === 'parametres') remplirParametres();
  if (nom === 'saisie') { zoomAuto(); appliquerZoom(); }
}

/* ==========================================================================
   Sauvegarde / restauration
   ========================================================================== */
function exporterSauvegarde() {
  const blob = new Blob([JSON.stringify(etat, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sauvegarde-ordres-de-mission-${aujourdhui()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Sauvegarde exportée.', 'succes');
}

function importerSauvegarde(fichier) {
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d.ordres || !Array.isArray(d.ordres)) throw new Error('Fichier non reconnu.');
      const ok = await confirmer('Importer une sauvegarde',
        `${d.ordres.length} ordre(s) et ${(d.agents || []).length} agent(s) vont remplacer les données actuelles.`,
        'Importer');
      if (!ok) return;
      appliquerEtat(d);
      await enregistrerEtat();
      majListes();
      dessinerArchives();
      dessinerRepertoire();
      toast('Sauvegarde importée.', 'succes');
    } catch (e) {
      toast(e.message, 'erreur', 'Import impossible');
    }
  };
  fr.readAsText(fichier);
}

/* ==========================================================================
   Demarrage
   ========================================================================== */
async function demarrer() {
  poserIcones();

  try { cssFormulaire = await (await fetch('form.css')).text(); } catch (e) {}
  try {
    const b = await (await fetch('logo.png')).blob();
    logoDataUri = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  } catch (e) {}

  try {
    const r = await api('/api/etat');
    environnement = Object.assign(environnement, r.environnement || {});
    revision = r.revision || 0;
    appliquerEtat(r.etat || {});
    signalerConnexion(true);
  } catch (err) {
    signalerConnexion(false);
    toast('Service injoignable : les données ne seront pas enregistrées.', 'erreur');
  }

  document.body.classList.toggle('distant', !environnement.local);

  brancherChamps();
  majListes();

  let repris = null;
  try {
    const b = localStorage.getItem('om-brouillon');
    if (b) repris = JSON.parse(b);
  } catch (e) {}
  courant = (repris && Array.isArray(repris.agents) && repris.agents.length) ? repris : ordreVierge();
  remplirChamps();
  dessinerAgents();
  majApercu();
  if (repris) toast('Brouillon en cours restauré.', '', 'Reprise');

  brancherInterface();
  setInterval(() => synchroniser(false), 20000);
}

function brancherInterface() {
  $$('.onglet').forEach(o => o.addEventListener('click', () => allerVue(o.dataset.vue)));
  $('#btnAjouterAgent').addEventListener('click', ajouterAgent);
  $('#btnEnregistrer').addEventListener('click', () => enregistrerOrdre(false));
  $('#btnPdf').addEventListener('click', genererPdf);
  $('#btnImprimer').addEventListener('click', imprimer);
  $('#btnApercuMobile').addEventListener('click', ouvrirApercu);
  $('#btnFermerApercu').addEventListener('click', fermerApercu);

  $('#btnNouveau').addEventListener('click', async () => {
    if (await confirmer('Vider le formulaire', 'Les informations non enregistrées seront perdues.', 'Vider')) {
      try { localStorage.removeItem('om-brouillon'); } catch (e) {}
      chargerOrdre(ordreVierge());
    }
  });
  $('#btnNouvelAgent').addEventListener('click', () => {
    etat.agents.push(AGENT_VIDE());
    planifierSauvegarde();
    dessinerRepertoire();
    const inp = $('#tableAgents tbody tr:last-child input');
    if (inp) inp.focus();
  });
  $('#recherche').addEventListener('input', dessinerArchives);
  $('#filtreAnnee').addEventListener('change', dessinerArchives);
  $('#filtreMois').addEventListener('change', dessinerArchives);
  $('#btnEnregistrerParams').addEventListener('click', enregistrerParametres);
  $('#btnExport').addEventListener('click', exporterSauvegarde);
  $('#btnImport').addEventListener('click', () => $('#fichierImport').click());
  $('#fichierImport').addEventListener('change', e => {
    if (e.target.files[0]) importerSauvegarde(e.target.files[0]);
    e.target.value = '';
  });

  const ouvrirDossier = () => api('/api/ouvrir', { chemin: environnement.racinePdf })
    .catch(() => toast('Dossier introuvable.', 'erreur'));
  const quitter = async () => {
    if (await confirmer('Quitter l’application',
        'Le service sera arrêté : les autres appareils connectés perdront l’accès. Les données enregistrées sont conservées.',
        'Quitter')) {
      try { await api('/api/quitter', {}); } catch (e) {}
      document.body.innerHTML = '<div class="vide" style="padding-top:120px"><b>Application fermée</b>Vous pouvez fermer cette fenêtre.</div>';
    }
  };
  $('#btnDossier').addEventListener('click', ouvrirDossier);
  $('#btnDossier2').addEventListener('click', ouvrirDossier);
  $('#btnQuitter').addEventListener('click', quitter);
  $('#btnQuitter2').addEventListener('click', quitter);

  $('#zoomPlus').addEventListener('click', () => { zoomManuel = true; zoom = Math.min(1.6, zoom + 0.1); appliquerZoom(); });
  $('#zoomMoins').addEventListener('click', () => { zoomManuel = true; zoom = Math.max(0.3, zoom - 0.1); appliquerZoom(); });
  $('#zoomVal').addEventListener('dblclick', () => { zoomManuel = false; zoomAuto(); });
  window.addEventListener('resize', () => { zoomAuto(); appliquerZoom(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('apercu-ouvert')) fermerApercu();
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); enregistrerOrdre(false); }
    if (e.ctrlKey && e.key.toLowerCase() === 'm') { e.preventDefault(); allerVue('saisie'); ajouterAgent(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) synchroniser(true);
  });
}

demarrer();
