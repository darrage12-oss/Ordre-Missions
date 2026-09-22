/* ==========================================================================
   qr.js — Generateur de QR code autonome (aucune dependance, hors ligne).
   Mode octet (UTF-8), correction d'erreur niveau M, versions 1 a 10.
   Suffisant pour une adresse du type http://192.168.1.20:8765/
   Expose : qrMatrice(texte) -> tableau 2D de booleens
            qrSvg(texte, options) -> chaine SVG
   ========================================================================== */

(function (global) {
  'use strict';

  /* ---------- Arithmetique dans GF(256) ---------- */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  function polynomeGenerateur(n) {
    let p = [1];
    for (let i = 0; i < n; i++) {
      const q = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++) {
        q[j] ^= p[j];
        q[j + 1] ^= mul(p[j], EXP[i]);
      }
      p = q;
    }
    return p;
  }

  function correction(donnees, n) {
    const g = polynomeGenerateur(n);
    const r = donnees.slice().concat(new Array(n).fill(0));
    for (let i = 0; i < donnees.length; i++) {
      const c = r[i];
      if (c === 0) continue;
      for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c);
    }
    return r.slice(donnees.length);
  }

  /* ---------- Tables : niveau de correction M, versions 1 a 10 ----------
     [codesCorrectionParBloc, blocsG1, donneesG1, blocsG2, donneesG2]      */
  const VERSIONS = {
    1:  [10, 1, 16, 0, 0],
    2:  [16, 1, 28, 0, 0],
    3:  [26, 1, 44, 0, 0],
    4:  [18, 2, 32, 0, 0],
    5:  [24, 2, 43, 0, 0],
    6:  [16, 4, 27, 0, 0],
    7:  [18, 4, 31, 0, 0],
    8:  [22, 2, 38, 2, 39],
    9:  [22, 3, 36, 2, 37],
    10: [26, 4, 43, 1, 44]
  };

  /* Centres des motifs d'alignement */
  const ALIGNEMENT = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  const donneesTotales = (v) => {
    const t = VERSIONS[v];
    return t[1] * t[2] + t[3] * t[4];
  };

  /* ---------- Codes BCH pour les informations de format et de version ---- */
  function degre(v) {
    let d = -1;
    while (v) { v >>>= 1; d++; }
    return d;
  }

  /* Reste de la division polynomiale de (valeur << bitsReste) par generateur */
  function bch(valeur, generateur, bitsReste) {
    let v = valeur << bitsReste;
    const dg = degre(generateur);
    while (degre(v) >= dg) v ^= generateur << (degre(v) - dg);
    return v;
  }

  function infoFormat(masque) {
    // Niveau de correction M = 00
    const donnees = (0x00 << 3) | masque;             // 5 bits
    const reste = bch(donnees, 0x537, 10);            // BCH(15,5)
    return ((donnees << 10) | reste) ^ 0x5412;
  }

  function infoVersion(version) {
    const reste = bch(version, 0x1f25, 12);           // BCH(18,6)
    return (version << 12) | reste;
  }

  /* ---------- Construction du flux binaire ---------- */
  function octetsUtf8(texte) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(texte));
    const out = [];
    for (const ch of unescape(encodeURIComponent(texte))) out.push(ch.charCodeAt(0));
    return out;
  }

  function choisirVersion(nbOctets) {
    for (let v = 1; v <= 10; v++) {
      const bitsCompteur = v < 10 ? 8 : 16;
      const capacite = Math.floor((donneesTotales(v) * 8 - 4 - bitsCompteur) / 8);
      if (nbOctets <= capacite) return v;
    }
    return null;
  }

  function fluxBinaire(octets, version) {
    const bits = [];
    const pousser = (valeur, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((valeur >> i) & 1);
    };
    const bitsCompteur = version < 10 ? 8 : 16;
    pousser(0b0100, 4);                    // mode octet
    pousser(octets.length, bitsCompteur);
    octets.forEach(o => pousser(o, 8));

    const capaciteBits = donneesTotales(version) * 8;
    for (let i = 0; i < 4 && bits.length < capaciteBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const remplissage = [0xec, 0x11];
    let k = 0;
    while (bits.length < capaciteBits) pousser(remplissage[k++ % 2], 8);

    const codes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let o = 0;
      for (let j = 0; j < 8; j++) o = (o << 1) | bits[i + j];
      codes.push(o);
    }
    return codes;
  }

  function entrelacer(codes, version) {
    const [nbEc, g1, d1, g2, d2] = VERSIONS[version];
    const blocs = [];
    let p = 0;
    for (let i = 0; i < g1; i++) { blocs.push(codes.slice(p, p + d1)); p += d1; }
    for (let i = 0; i < g2; i++) { blocs.push(codes.slice(p, p + d2)); p += d2; }
    const blocsEc = blocs.map(b => correction(b, nbEc));

    const sortie = [];
    const maxDonnees = Math.max(d1, d2);
    for (let i = 0; i < maxDonnees; i++) {
      for (const b of blocs) if (i < b.length) sortie.push(b[i]);
    }
    for (let i = 0; i < nbEc; i++) {
      for (const b of blocsEc) sortie.push(b[i]);
    }

    const bits = [];
    sortie.forEach(o => { for (let i = 7; i >= 0; i--) bits.push((o >> i) & 1); });
    return bits;
  }

  /* ---------- Motifs fixes ---------- */
  function matriceVide(taille) {
    const m = [], r = [];
    for (let i = 0; i < taille; i++) {
      m.push(new Array(taille).fill(false));
      r.push(new Array(taille).fill(false));
    }
    return { modules: m, reserve: r };
  }

  function poserMotifs(g, taille, version) {
    const { modules, reserve } = g;
    const poser = (l, c, v) => { modules[l][c] = v; reserve[l][c] = true; };

    // Motifs de reperage + separateurs
    const coins = [[0, 0], [0, taille - 7], [taille - 7, 0]];
    for (const [L, C] of coins) {
      for (let i = -1; i <= 7; i++) {
        for (let j = -1; j <= 7; j++) {
          const l = L + i, c = C + j;
          if (l < 0 || c < 0 || l >= taille || c >= taille) continue;
          const bord = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                       (j >= 0 && j <= 6 && (i === 0 || i === 6));
          const centre = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          poser(l, c, bord || centre);
        }
      }
    }

    // Motifs de synchronisation
    for (let i = 8; i < taille - 8; i++) {
      poser(6, i, i % 2 === 0);
      poser(i, 6, i % 2 === 0);
    }

    // Motifs d'alignement
    const centres = ALIGNEMENT[version];
    for (const l of centres) {
      for (const c of centres) {
        if ((l === 6 && c === 6) || (l === 6 && c === taille - 7) || (l === taille - 7 && c === 6)) continue;
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            poser(l + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1);
          }
        }
      }
    }

    // Module toujours noir
    poser(taille - 8, 8, true);

    // Zones reservees aux informations de format
    for (let i = 0; i <= 8; i++) {
      if (!reserve[8][i]) reserve[8][i] = true;
      if (!reserve[i][8]) reserve[i][8] = true;
    }
    for (let i = 0; i < 8; i++) {
      reserve[taille - 1 - i][8] = true;
      reserve[8][taille - 1 - i] = true;
    }

    // Zones reservees aux informations de version
    if (version >= 7) {
      for (let i = 0; i < 18; i++) {
        const l = Math.floor(i / 3), c = taille - 11 + (i % 3);
        reserve[l][c] = true;
        reserve[c][l] = true;
      }
    }
  }

  function poserDonnees(g, taille, bits) {
    const { modules, reserve } = g;
    let direction = -1, ligne = taille - 1, index = 0;
    for (let colonne = taille - 1; colonne > 0; colonne -= 2) {
      if (colonne === 6) colonne--;
      for (;;) {
        for (let d = 0; d < 2; d++) {
          const c = colonne - d;
          if (!reserve[ligne][c]) {
            modules[ligne][c] = index < bits.length ? bits[index++] === 1 : false;
          }
        }
        ligne += direction;
        if (ligne < 0 || ligne >= taille) { ligne -= direction; direction = -direction; break; }
      }
    }
  }

  const MASQUES = [
    (i, j) => (i + j) % 2 === 0,
    (i, j) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
    (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0,
    (i, j) => ((i + j) % 2 + (i * j) % 3) % 2 === 0
  ];

  function penalite(m, taille) {
    let score = 0;

    // Regle 1 : suites de 5 modules identiques
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < taille; i++) {
        let precedent = null, suite = 0;
        for (let j = 0; j < taille; j++) {
          const v = k === 0 ? m[i][j] : m[j][i];
          if (v === precedent) { suite++; }
          else { if (suite >= 5) score += 3 + (suite - 5); precedent = v; suite = 1; }
        }
        if (suite >= 5) score += 3 + (suite - 5);
      }
    }

    // Regle 2 : blocs 2x2 de meme couleur
    for (let i = 0; i < taille - 1; i++) {
      for (let j = 0; j < taille - 1; j++) {
        const v = m[i][j];
        if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
      }
    }

    // Regle 3 : motifs proches des reperes
    const motifA = [true, false, true, true, true, false, true, false, false, false, false];
    const motifB = [false, false, false, false, true, false, true, true, true, false, true];
    const comparer = (ligne, debut, motif) => {
      for (let k = 0; k < 11; k++) if (ligne[debut + k] !== motif[k]) return false;
      return true;
    };
    for (let i = 0; i < taille; i++) {
      const horizontale = m[i];
      const verticale = [];
      for (let j = 0; j < taille; j++) verticale.push(m[j][i]);
      for (let j = 0; j <= taille - 11; j++) {
        if (comparer(horizontale, j, motifA) || comparer(horizontale, j, motifB)) score += 40;
        if (comparer(verticale, j, motifA) || comparer(verticale, j, motifB)) score += 40;
      }
    }

    // Regle 4 : equilibre noir / blanc
    let noirs = 0;
    for (let i = 0; i < taille; i++) for (let j = 0; j < taille; j++) if (m[i][j]) noirs++;
    const pourcent = (noirs * 100) / (taille * taille);
    score += 10 * Math.floor(Math.abs(pourcent - 50) / 5);

    return score;
  }

  function poserFormat(m, taille, masque) {
    const info = infoFormat(masque);
    const bit = (i) => ((info >> i) & 1) === 1;
    for (let i = 0; i < 6; i++) m[8][i] = bit(i);
    m[8][7] = bit(6);
    m[8][8] = bit(7);
    m[7][8] = bit(8);
    for (let i = 9; i < 15; i++) m[14 - i][8] = bit(i);
    for (let i = 0; i < 7; i++) m[taille - 1 - i][8] = bit(i);
    for (let i = 7; i < 15; i++) m[8][taille - 15 + i] = bit(i);
    m[taille - 8][8] = true;
  }

  function poserVersion(m, taille, version) {
    if (version < 7) return;
    const info = infoVersion(version);
    for (let i = 0; i < 18; i++) {
      const v = ((info >> i) & 1) === 1;
      const l = Math.floor(i / 3), c = taille - 11 + (i % 3);
      m[l][c] = v;
      m[c][l] = v;
    }
  }

  /* ---------- Point d'entree ---------- */
  function qrMatrice(texte) {
    const octets = octetsUtf8(String(texte));
    const version = choisirVersion(octets.length);
    if (!version) throw new Error('Texte trop long pour ce generateur de QR code.');
    const taille = 17 + 4 * version;

    const base = matriceVide(taille);
    poserMotifs(base, taille, version);
    poserDonnees(base, taille, entrelacer(fluxBinaire(octets, version), version));

    let meilleure = null, meilleurScore = Infinity;
    for (let masque = 0; masque < 8; masque++) {
      const m = base.modules.map(l => l.slice());
      for (let i = 0; i < taille; i++) {
        for (let j = 0; j < taille; j++) {
          if (!base.reserve[i][j] && MASQUES[masque](i, j)) m[i][j] = !m[i][j];
        }
      }
      poserFormat(m, taille, masque);
      poserVersion(m, taille, version);
      const s = penalite(m, taille);
      if (s < meilleurScore) { meilleurScore = s; meilleure = m; }
    }
    return meilleure;
  }

  function qrSvg(texte, options) {
    const o = options || {};
    const marge = o.marge === undefined ? 3 : o.marge;
    const couleur = o.couleur || '#10233a';
    const fond = o.fond || '#ffffff';
    const m = qrMatrice(texte);
    const n = m.length;
    const total = n + marge * 2;

    let chemin = '';
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (m[i][j]) chemin += `M${j + marge} ${i + marge}h1v1h-1z`;
      }
    }
    const taille = o.taille ? ` width="${o.taille}" height="${o.taille}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"${taille} ` +
      `shape-rendering="crispEdges" role="img" aria-label="QR code : ${String(texte).replace(/"/g, '')}">` +
      `<rect width="${total}" height="${total}" fill="${fond}"/>` +
      `<path d="${chemin}" fill="${couleur}"/></svg>`;
  }

  global.qrMatrice = qrMatrice;
  global.qrSvg = qrSvg;

})(typeof window !== 'undefined' ? window : this);
