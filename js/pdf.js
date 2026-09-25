const PDF = {
    // Generate exact 100% replica of the Moroccan SRM TTA Ordre de Mission form
    generateTemplate(missionData) {
        const m = missionData || {};
        const agent = m.agent || {};
        
        const year = m.dateDepart ? new Date(m.dateDepart).getFullYear() : (new Date().getFullYear());
        const dateDepart = this._formatDate(m.dateDepart);
        const dateRetour = this._formatDate(m.dateRetour);
        const heureDepart = this._formatTime(m.heureDepart);
        const heureRetour = this._formatTime(m.heureRetour);
        const dateCreation = this._formatDate(m.dateCreation || m.dateDepart);
        const lieuCreation = m.lieuCreation || agent.province || 'OUEZZANE';

        // Exact square checkbox matching the form
        const checkSvg = `<svg width="11" height="11" viewBox="0 0 12 12" style="vertical-align: middle; margin-right: 4px; display: inline-block;">
            <rect x="0.5" y="0.5" width="11" height="11" fill="#fff" stroke="#000" stroke-width="1.2"/>
            <path d="M2.5 6 L5 9 L9.5 2.5" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        
        const emptyBoxSvg = `<svg width="11" height="11" viewBox="0 0 12 12" style="vertical-align: middle; margin-right: 4px; display: inline-block;">
            <rect x="0.5" y="0.5" width="11" height="11" fill="#fff" stroke="#000" stroke-width="1.2"/>
        </svg>`;

        const isCov = Boolean(m.covoiturage);
        const isVehServ = Boolean(m.vehiculeService);
        const isTranspCom = Boolean(m.transportCommun);
        const isVehPerso = Boolean(m.vehiculePerso);

        const logoSrc = (typeof LOGO_BASE64 !== 'undefined' && LOGO_BASE64) ? LOGO_BASE64 : 'assets/logo.png';

        return `
        <div class="a4-document">
            <!-- EN-TETE / HEADER TABLE -->
            <table class="om-table om-table-header">
                <tr>
                    <td class="om-td-logo">
                        <img src="${logoSrc}" alt="Logo SRM TTA" class="om-logo-img">
                    </td>
                    <td class="om-td-title">
                        <div class="om-hdr-subtitle">Formulaire Direction Provinciale</div>
                        <div class="om-hdr-title">Ordre de mission</div>
                    </td>
                    <td class="om-td-meta">
                        <div class="om-meta-row om-b-bottom">${year}</div>
                        <div class="om-meta-row om-b-bottom">Version : 01</div>
                        <div class="om-meta-row">Page 1 sur 1</div>
                    </td>
                </tr>
            </table>

            <!-- CORPS PRINCIPAL: TABLE UNIQUE STRICTEMENT CONTINUE -->
            <table class="om-table om-table-body">
                <!-- SECTION DEMANDEUR -->
                <tr>
                    <th colspan="2" class="om-th-section">Demandeur</th>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-label">Nom et prénom :</span>
                            <span class="om-dots"><span class="om-value">${agent.nom || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Matricule :</span>
                            <span class="om-dots"><span class="om-value">${agent.matricule || ''}</span></span>
                        </div>
                    </td>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Fonction :</span>
                            <span class="om-dots"><span class="om-value">${agent.fonction || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Direction :</span>
                            <span class="om-dots"><span class="om-value">${agent.direction || ''}</span></span>
                        </div>
                    </td>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Département :</span>
                            <span class="om-dots"><span class="om-value">${agent.departement || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Division :</span>
                            <span class="om-dots"><span class="om-value">${agent.division || ''}</span></span>
                        </div>
                    </td>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Service :</span>
                            <span class="om-dots"><span class="om-value">${agent.service || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-label">Province / Préfecture :</span>
                            <span class="om-dots"><span class="om-value">${agent.province || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr class="om-row-spacer"><td colspan="2"></td></tr>

                <!-- SECTION OBJET DE LA MISSION -->
                <tr>
                    <th colspan="2" class="om-th-section">Objet de la mission</th>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-label">Lieu de déplacement :</span>
                            <span class="om-dots"><span class="om-value">${m.lieuDeplacement || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-label">Motif du déplacement :</span>
                            <span class="om-dots"><span class="om-value">${m.motifDeplacement || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Date de départ :</span>
                            <span class="om-dots"><span class="om-value">${dateDepart}</span></span>
                        </div>
                    </td>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Heure de départ :</span>
                            <span class="om-dots"><span class="om-value">${heureDepart}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Date de retour :</span>
                            <span class="om-dots"><span class="om-value">${dateRetour}</span></span>
                        </div>
                    </td>
                    <td class="om-td-row om-col-half">
                        <div class="om-field">
                            <span class="om-label">Heure de retour :</span>
                            <span class="om-dots"><span class="om-value">${heureRetour}</span></span>
                        </div>
                    </td>
                </tr>
                <tr class="om-row-spacer"><td colspan="2"></td></tr>

                <!-- SECTION MOYEN DE TRANSPORT -->
                <tr>
                    <th colspan="2" class="om-th-section">Moyen de transport</th>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-checkbox">${isCov ? checkSvg : emptyBoxSvg}</span>
                            <span class="om-label">Covoiturage :</span>
                            <span class="om-dots"></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-checkbox">${isVehServ ? checkSvg : emptyBoxSvg}</span>
                            <span class="om-label">Véhicule de service :</span>
                            <span class="om-dots"><span class="om-value">${m.vehiculeServiceNum || ''}</span></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field">
                            <span class="om-checkbox">${isTranspCom ? checkSvg : emptyBoxSvg}</span>
                            <span class="om-label">Transport commun :</span>
                            <span class="om-dots"></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" class="om-td-row">
                        <div class="om-field-split">
                            <div class="om-field" style="flex: 1.1;">
                                <span class="om-checkbox">${isVehPerso ? checkSvg : emptyBoxSvg}</span>
                                <span class="om-label">Véhicule personnel : &nbsp; Marque :</span>
                                <span class="om-dots"><span class="om-value">${m.vehiculePersoMarque || ''}</span></span>
                            </div>
                            <div class="om-field" style="flex: 0.9; margin-left: 12px;">
                                <span class="om-label">Puissance Fiscale :</span>
                                <span class="om-dots"><span class="om-value">${m.puissanceFiscale || ''}</span></span>
                            </div>
                        </div>
                    </td>
                </tr>

                <!-- SIGNATURE & DATE -->
                <tr>
                    <td colspan="2" class="om-td-signature">
                        <div class="om-sig-container">
                            <div class="om-sig-left">
                                <div class="om-sig-line">
                                    <span>Fait le :</span>
                                    <span class="om-dots-fixed" style="width: 140px; text-align: center;">${dateCreation.split('/').join(' / ')}</span>
                                </div>
                                <div class="om-sig-line" style="margin-top: 14px;">
                                    <span>à</span>
                                    <span class="om-dots-fixed" style="width: 180px;">${lieuCreation}</span>
                                </div>
                            </div>
                            <div class="om-sig-right">
                                <div class="om-sig-title">Signature de l'agent</div>
                                <div class="om-sig-dots"></div>
                            </div>
                        </div>
                    </td>
                </tr>

                <!-- VISAS (2x2) -->
                <tr>
                    <th class="om-th-visa om-border-right">Visa Chef hiérarchique</th>
                    <th class="om-th-visa">Visa Chef de Département</th>
                </tr>
                <tr>
                    <td class="om-td-visa om-border-right" style="height: 37mm;"></td>
                    <td class="om-td-visa" style="height: 37mm;"></td>
                </tr>
                <tr>
                    <th class="om-th-visa om-border-right">Visa Directeur Provincial/Préfectoral</th>
                    <th class="om-th-visa">Visa Directeur Central Concerné</th>
                </tr>
                <tr>
                    <td class="om-td-visa om-border-right" style="height: 41mm;"></td>
                    <td class="om-td-visa om-td-visa-notice" style="height: 41mm;">
                        <div class="om-visa-notice-text">
                            Prière renseigner si le demandeur relève d’une fonction : Technique, support , clientèle ; ou capital humain
                        </div>
                    </td>
                </tr>
            </table>

            <!-- NOTE BAS DE PAGE -->
            <div class="om-page-note">
                NB/Le montant global des frais de déplacement doit figurer sur le formulaire de demande de remboursement des frais de déplacement.
            </div>
        </div>
        `;
    },

    // Show preview modal with the generated template
    showPreview(missionData) {
        this._currentMissionData = missionData;
        const html = this.generateTemplate(missionData);
        const container = document.getElementById('preview-container');
        if (container) {
            container.innerHTML = html;
        }
        // Also update print-template directly
        const printDiv = document.getElementById('print-template');
        if (printDiv) {
            printDiv.innerHTML = html;
        }
        const modal = document.getElementById('modal-preview');
        if (modal) {
            modal.classList.add('show');
        }
    },

    // Close preview modal
    closePreview(event) {
        if (event && event.target !== event.currentTarget) return;
        const modal = document.getElementById('modal-preview');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    // Export 100% pixel-perfect A4 PDF using html2pdf strictly on 1 single page
    exportPDF() {
        const modalContent = document.getElementById('preview-container');
        const element = modalContent ? modalContent.querySelector('.a4-document') : null;
        if (!element) {
            App.showToast('Erreur : Aucun document à exporter', 'error');
            return;
        }

        const agentName = this._currentMissionData?.agent?.nom || 'Agent';
        const date = this._currentMissionData?.dateDepart || new Date().toISOString().split('T')[0];
        const cleanName = agentName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Ordre_de_Mission_${cleanName}_${date}.pdf`;

        App.showToast('Génération du PDF A4 (1 page)...', 'info');

        const origTransform = element.style.transform;
        const origMargin = element.style.margin;
        
        const container = document.getElementById('preview-container');
        const origJustify = container.style.justifyContent;

        element.style.transform = 'none';
        element.style.margin = '0';
        container.style.justifyContent = 'flex-start';
        
        const originalScrollX = window.scrollX;
        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0);

        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = totalPages; i > 1; i--) {
                pdf.deletePage(i);
            }
        }).save().then(() => {
            element.style.transform = origTransform;
            element.style.margin = origMargin;
            container.style.justifyContent = origJustify;
            window.scrollTo(originalScrollX, originalScrollY);
            App.showToast('PDF A4 (1 page) téléchargé avec succès !', 'success');
        }).catch(err => {
            element.style.transform = origTransform;
            element.style.margin = origMargin;
            container.style.justifyContent = origJustify;
            window.scrollTo(originalScrollX, originalScrollY);
            console.error(err);
            App.showToast('Erreur lors de l\'export PDF', 'error');
        });
    },

    exportPDFById(id) {
        const mission = Missions.getById(id);
        if (!mission) {
            App.showToast('Mission non trouvée', 'error');
            return;
        }
        this.showPreview(mission);
        setTimeout(() => this.exportPDF(), 400);
    },

    // Print with exact @media print styling
    print() {
        const content = document.getElementById('preview-container').innerHTML;
        const printDiv = document.getElementById('print-template');
        printDiv.innerHTML = content;
        window.print();
    },

    _formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    },

    _formatTime(timeStr) {
        if (!timeStr) return '';
        return timeStr.replace(':', 'h');
    },

    _currentMissionData: null
};

// Auto prepare print template when user triggers browser print directly (Ctrl+P)
window.addEventListener('beforeprint', () => {
    const printDiv = document.getElementById('print-template');
    if (printDiv && (!printDiv.innerHTML || printDiv.innerHTML.trim() === '')) {
        if (PDF._currentMissionData) {
            printDiv.innerHTML = PDF.generateTemplate(PDF._currentMissionData);
        } else if (typeof Missions !== 'undefined' && Missions.getAll().length > 0) {
            printDiv.innerHTML = PDF.generateTemplate(Missions.getAll()[0]);
        }
    }
});
