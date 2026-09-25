const Missions = {
    STORAGE_KEY: 'ordre_mission_missions',

    // Get all missions from localStorage
    getAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Get a single mission by id
    getById(id) {
        return this.getAll().find(m => m.id === id);
    },

    // Save missions array to localStorage
    _save(missions) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(missions));
    },

    // Generate unique ID
    _generateId() {
        return 'mission_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // Save mission from the form (called on form submit)
    save(event) {
        if (event) event.preventDefault();
        
        // Check if an active user is selected (Users.activeUserId)
        if (!Users.activeUserId) {
            App.showToast('Veuillez sélectionner un agent', 'error');
            return;
        }
        
        // Get the active user info
        const user = Users.getById(Users.activeUserId);
        
        // Read all form fields
        const missionIdField = document.getElementById('mission-id').value;
        const isNew = !missionIdField;
        
        const mission = {
            id: missionIdField || this._generateId(),
            userId: user.id,
            agent: {
                nom: user.nom,
                matricule: user.matricule,
                fonction: user.fonction,
                departement: user.departement,
                direction: user.direction,
                division: user.division,
                service: user.service,
                province: user.province
            },
            lieuDeplacement: document.getElementById('m-lieu').value,
            motifDeplacement: document.getElementById('m-motif').value,
            dateDepart: document.getElementById('m-date-depart').value,
            heureDepart: document.getElementById('m-heure-depart').value,
            dateRetour: document.getElementById('m-date-retour').value,
            heureRetour: document.getElementById('m-heure-retour').value,
            covoiturage: document.getElementById('m-covoiturage').checked,
            vehiculeService: document.getElementById('m-vehicule-service').checked,
            vehiculeServiceNum: document.getElementById('m-vehicule-service-num').value,
            transportCommun: document.getElementById('m-transport-commun').checked,
            vehiculePerso: document.getElementById('m-vehicule-perso').checked,
            vehiculePersoMarque: document.getElementById('m-vehicule-perso-marque').value,
            puissanceFiscale: document.getElementById('m-puissance-fiscale').value,
            lieuCreation: document.getElementById('m-lieu-creation').value,
            dateCreation: document.getElementById('m-date-creation').value,
            createdAt: new Date().toISOString()
        };
        
        const missions = this.getAll();
        
        if (isNew) {
            missions.push(mission);
            App.showToast('Mission créée avec succès', 'success');
        } else {
            const index = missions.findIndex(m => m.id === mission.id);
            if (index !== -1) {
                // Preserve createdAt if editing
                mission.createdAt = missions[index].createdAt;
                missions[index] = mission;
                App.showToast('Mission modifiée avec succès', 'success');
            } else {
                missions.push(mission);
                App.showToast('Mission enregistrée avec succès', 'success');
            }
        }
        
        this._save(missions);
        
        if (isNew) {
            this.resetForm();
            App.switchView('history');
            History.render();
        } else {
            History.render();
            App.switchView('history');
        }
    },

    // Delete a mission by id (with confirmation)
    deleteMission(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
            const missions = this.getAll().filter(m => m.id !== id);
            this._save(missions);
            App.showToast('Mission supprimée', 'success');
            History.render();
        }
    },

    // Load a mission into the form for editing
    editMission(id) {
        const mission = this.getById(id);
        if (!mission) {
            App.showToast('Mission introuvable', 'error');
            return;
        }
        
        App.switchView('new');
        
        // Select the user in the dropdown and set active user
        Users.selectActiveUser(mission.userId);
        
        document.getElementById('mission-id').value = mission.id;
        document.getElementById('m-lieu').value = mission.lieuDeplacement || '';
        document.getElementById('m-motif').value = mission.motifDeplacement || '';
        document.getElementById('m-date-depart').value = mission.dateDepart || '';
        document.getElementById('m-heure-depart').value = mission.heureDepart || '';
        document.getElementById('m-date-retour').value = mission.dateRetour || '';
        document.getElementById('m-heure-retour').value = mission.heureRetour || '';
        
        document.getElementById('m-covoiturage').checked = !!mission.covoiturage;
        document.getElementById('m-vehicule-service').checked = !!mission.vehiculeService;
        document.getElementById('m-vehicule-service-num').value = mission.vehiculeServiceNum || '';
        document.getElementById('m-transport-commun').checked = !!mission.transportCommun;
        document.getElementById('m-vehicule-perso').checked = !!mission.vehiculePerso;
        document.getElementById('m-vehicule-perso-marque').value = mission.vehiculePersoMarque || '';
        document.getElementById('m-puissance-fiscale').value = mission.puissanceFiscale || '';
        document.getElementById('m-kilometrage').value = mission.kilometrage || '';
        
        document.getElementById('m-lieu-creation').value = mission.lieuCreation || '';
        document.getElementById('m-date-creation').value = mission.dateCreation || '';
        
        App.showToast('Mission chargée pour modification', 'info');
    },

    // Preview and print current form data
    previewAndPrint() {
        if (!Users.activeUserId) {
            App.showToast('Veuillez sélectionner un agent d\'abord', 'error');
            return;
        }
        
        // Create a temporary mission object from form data for preview
        const user = Users.getById(Users.activeUserId);
        const mission = {
            id: document.getElementById('mission-id').value || 'preview_id',
            userId: user.id,
            agent: {
                nom: user.nom,
                matricule: user.matricule,
                fonction: user.fonction,
                departement: user.departement,
                direction: user.direction,
                division: user.division,
                service: user.service,
                province: user.province
            },
            lieuDeplacement: document.getElementById('m-lieu').value,
            motifDeplacement: document.getElementById('m-motif').value,
            dateDepart: document.getElementById('m-date-depart').value,
            heureDepart: document.getElementById('m-heure-depart').value,
            dateRetour: document.getElementById('m-date-retour').value,
            heureRetour: document.getElementById('m-heure-retour').value,
            covoiturage: document.getElementById('m-covoiturage').checked,
            vehiculeService: document.getElementById('m-vehicule-service').checked,
            vehiculeServiceNum: document.getElementById('m-vehicule-service-num').value,
            transportCommun: document.getElementById('m-transport-commun').checked,
            vehiculePerso: document.getElementById('m-vehicule-perso').checked,
            vehiculePersoMarque: document.getElementById('m-vehicule-perso-marque').value,
            puissanceFiscale: document.getElementById('m-puissance-fiscale').value,
            lieuCreation: document.getElementById('m-lieu-creation').value,
            dateCreation: document.getElementById('m-date-creation').value,
            createdAt: new Date().toISOString()
        };
        
        if (typeof PDF !== 'undefined' && PDF.showPreview) {
            PDF.showPreview(mission);
        } else {
            console.error('PDF module not found');
        }
    },

    // Preview from history (existing mission)
    previewMission(id) {
        const mission = this.getById(id);
        if (mission && typeof PDF !== 'undefined' && PDF.showPreview) {
            PDF.showPreview(mission);
        } else {
            App.showToast('Erreur lors de la prévisualisation', 'error');
        }
    },

    // Reset the mission form
    resetForm() {
        const form = document.getElementById('mission-form');
        if (form) form.reset();
        
        document.getElementById('mission-id').value = '';
        
        // Re-fill agent info from active user
        if (Users.activeUserId) {
            Users.selectActiveUser(Users.activeUserId);
        }
        
        // Set default dates to today
        const today = new Date().toISOString().split('T')[0];
        const dateDepart = document.getElementById('m-date-depart');
        if (dateDepart) dateDepart.value = today;
        
        const dateRetour = document.getElementById('m-date-retour');
        if (dateRetour) dateRetour.value = today;
        
        const dateCreation = document.getElementById('m-date-creation');
        if (dateCreation) dateCreation.value = today;
        
        const heureDepart = document.getElementById('m-heure-depart');
        if (heureDepart) heureDepart.value = '08:00';
        
        const heureRetour = document.getElementById('m-heure-retour');
        if (heureRetour) heureRetour.value = '17:00';
    },

    // Get missions filtered by month/year
    getByMonth(year, month) {
        // Filter missions where dateDepart falls in the given month/year
        // month is 0-indexed
        return this.getAll().filter(m => {
            if (!m.dateDepart) return false;
            const d = new Date(m.dateDepart);
            return d.getFullYear() === year && d.getMonth() === month;
        }).sort((a, b) => new Date(b.dateDepart) - new Date(a.dateDepart)); // Descending order
    }
};

const History = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),

    init() {
        this.render();
    },

    prevMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.render();
    },

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.render();
    },

    render() {
        // Update month label (in French: 'Septembre 2026')
        const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const labelEl = document.getElementById('history-month-label');
        if (labelEl) {
            labelEl.textContent = monthNames[this.currentMonth] + ' ' + this.currentYear;
        }

        // Get missions for this month
        const missions = Missions.getByMonth(this.currentYear, this.currentMonth);

        // Update stats
        const statsEl = document.getElementById('history-stats');
        if (statsEl) {
            statsEl.innerHTML = `<span>${missions.length} ordre(s) de mission</span>`;
        }

        // Render mission cards
        const list = document.getElementById('history-list');
        if (!list) return;
        
        if (missions.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-muted, #6c757d);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; color: var(--border-color, #dee2e6);"></i>
                    <p style="font-size: 1.2rem;">Aucun ordre de mission pour ce mois</p>
                </div>
            `;
            return;
        }

        list.innerHTML = missions.map(m => {
            const dateDepart = this._formatDate(m.dateDepart);
            const heureDepart = this._formatTime(m.heureDepart);
            const heureRetour = this._formatTime(m.heureRetour);
            return `
                <div class="mission-card">
                    <div class="mission-card-header">
                        <h3>${m.agent ? m.agent.nom : 'Agent inconnu'}</h3>
                        <span class="tag">${dateDepart}</span>
                    </div>
                    <div class="mission-card-body">
                        <p><i class="fas fa-map-marker-alt"></i> <strong>Lieu:</strong> ${m.lieuDeplacement}</p>
                        <p><i class="fas fa-clipboard"></i> <strong>Motif:</strong> ${this._truncate(m.motifDeplacement, 80)}</p>
                        <p><i class="fas fa-clock"></i> <strong>Horaire:</strong> ${heureDepart} - ${heureRetour}</p>
                        <p><i class="fas fa-car"></i> <strong>Transport:</strong> ${this._getTransportLabel(m)}</p>
                    </div>
                    <div class="mission-card-footer">
                        <button class="btn btn-sm btn-primary" onclick="Missions.previewMission('${m.id}')" title="Aperçu">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="if(typeof PDF !== 'undefined') PDF.exportPDFById('${m.id}')" title="PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="Missions.editMission('${m.id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Missions.deleteMission('${m.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    _formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return parts[2] + '/' + parts[1] + '/' + parts[0];  // DD/MM/YYYY
    },

    _formatTime(timeStr) {
        if (!timeStr) return '';
        return timeStr.replace(':', 'h');  // 08:00 -> 08h00
    },

    _truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    },

    _getTransportLabel(m) {
        const labels = [];
        if (m.vehiculeService) labels.push('Véhicule de service');
        if (m.transportCommun) labels.push('Transport commun');
        if (m.vehiculePerso) labels.push('Véhicule personnel');
        if (m.covoiturage) labels.push('Covoiturage');
        return labels.join(', ') || 'Non spécifié';
    }
};
