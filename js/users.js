const Users = {
    STORAGE_KEY: 'ordre_mission_users',
    activeUserId: null,

    init() {
        this.populateDropdown();
        this.renderUsersList();
        
        // Load active user from localStorage if exists
        const savedActiveId = localStorage.getItem('ordre_mission_active_user');
        if (savedActiveId) {
            const user = this.getById(savedActiveId);
            if (user) {
                const select = document.getElementById('active-user-select');
                if (select) select.value = savedActiveId;
                this.selectActiveUser(savedActiveId);
            }
        }
    },

    getAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getById(id) {
        return this.getAll().find(user => user.id === id);
    },

    _save(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    },

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    openModal(userId = null) {
        const modal = document.getElementById('modal-user');
        const form = document.getElementById('user-form');
        const title = document.getElementById('modal-user-title');
        
        if (form) form.reset();
        
        if (userId) {
            const user = this.getById(userId);
            if (user) {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val || '';
                };
                setVal('u-id', user.id);
                setVal('u-nom', user.nom);
                setVal('u-matricule', user.matricule);
                setVal('u-fonction', user.fonction);
                setVal('u-departement', user.departement);
                setVal('u-direction', user.direction);
                setVal('u-division', user.division);
                setVal('u-service', user.service);
                setVal('u-province', user.province);
                if (title) title.innerHTML = '<i class="fas fa-user-edit"></i> Modifier l\'Agent';
            }
        } else {
            const idEl = document.getElementById('u-id');
            if (idEl) idEl.value = '';
            if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Ajouter un Agent';
        }
        
        if (modal) {
            modal.classList.add('show');
        }
    },

    closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        const modal = document.getElementById('modal-user');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    saveUser(event) {
        if (event) event.preventDefault();
        
        const getVal = id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        const idInput = getVal('u-id');
        const user = {
            id: idInput || this._generateId(),
            nom: getVal('u-nom'),
            matricule: getVal('u-matricule'),
            fonction: getVal('u-fonction'),
            departement: getVal('u-departement'),
            direction: getVal('u-direction'),
            division: getVal('u-division'),
            service: getVal('u-service'),
            province: getVal('u-province')
        };
        
        let users = this.getAll();
        
        if (idInput) {
            const index = users.findIndex(u => u.id === idInput);
            if (index !== -1) {
                users[index] = user;
            }
        } else {
            users.push(user);
        }
        
        this._save(users);
        
        this.populateDropdown();
        this.renderUsersList();
        this.closeModal();
        
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Utilisateur enregistré avec succès', 'success');
        }
    },

    deleteUser(id) {
        if (confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
            let users = this.getAll();
            users = users.filter(user => user.id !== id);
            this._save(users);
            
            if (this.activeUserId === id) {
                this.activeUserId = null;
                localStorage.removeItem('ordre_mission_active_user');
                const select = document.getElementById('active-user-select');
                if (select) select.value = '';
                this.updateActiveUserInfo();
            }
            
            this.populateDropdown();
            this.renderUsersList();
            
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Utilisateur supprimé', 'success');
            }
        }
    },

    selectActiveUser(userId) {
        this.activeUserId = userId;
        
        if (userId) {
            localStorage.setItem('ordre_mission_active_user', userId);
            const user = this.getById(userId);
            if (user) {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val || '';
                };
                
                setVal('m-nom', user.nom);
                setVal('m-matricule', user.matricule);
                setVal('m-fonction', user.fonction);
                setVal('m-direction', user.direction);
                setVal('m-departement', user.departement);
                setVal('m-division', user.division);
                setVal('m-service', user.service);
                setVal('m-province', user.province);
                setVal('m-lieu-creation', user.province);
            }
        } else {
            localStorage.removeItem('ordre_mission_active_user');
        }
        
        this.updateActiveUserInfo();
    },

    populateDropdown() {
        const select = document.getElementById('active-user-select');
        if (!select) return;
        
        const users = this.getAll();
        select.innerHTML = '<option value="">-- Sélectionner un utilisateur --</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nom;
            select.appendChild(option);
        });
        
        if (this.activeUserId && this.getById(this.activeUserId)) {
            select.value = this.activeUserId;
        }
    },

    renderUsersList() {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        const users = this.getAll();
        
        if (users.length === 0) {
            container.innerHTML = '<p>Aucun utilisateur enregistré.</p>';
            return;
        }
        
        container.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-card-header">
                    <h3>${user.nom || ''}</h3>
                    <span class="tag">${user.matricule || 'N/A'}</span>
                </div>
                <div class="user-card-body">
                    <p><strong>Fonction:</strong> ${user.fonction || '-'}</p>
                    <p><strong>Direction:</strong> ${user.direction || '-'}</p>
                    <p><strong>Département:</strong> ${user.departement || '-'}</p>
                    <p><strong>Division:</strong> ${user.division || '-'}</p>
                    <p><strong>Service:</strong> ${user.service || '-'}</p>
                    <p><strong>Province:</strong> ${user.province || '-'}</p>
                </div>
                <div class="user-card-actions">
                    <button type="button" onclick="Users.openModal('${user.id}')">Edit</button>
                    <button type="button" onclick="Users.deleteUser('${user.id}')">Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    updateActiveUserInfo() {
        const infoBar = document.getElementById('active-user-info');
        if (!infoBar) return;
        
        if (this.activeUserId) {
            const user = this.getById(this.activeUserId);
            if (user) {
                infoBar.innerHTML = `<span>${user.nom || ''} | ${user.matricule || 'N/A'} | ${user.fonction || 'N/A'}</span>`;
                infoBar.style.display = 'block';
            } else {
                infoBar.style.display = 'none';
            }
        } else {
            infoBar.style.display = 'none';
        }
    }
};
