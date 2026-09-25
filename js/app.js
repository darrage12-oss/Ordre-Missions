const App = {
    // Initialize the application
    init() {
        // Initialize Users module
        Users.init();
        // Initialize History module
        History.init();
        // Set default dates on the mission form
        this.setDefaultDates();
        // Restore active user from localStorage
        const savedUserId = localStorage.getItem('ordre_mission_active_user');
        if (savedUserId) {
            document.getElementById('active-user-select').value = savedUserId;
            Users.selectActiveUser(savedUserId);
        }
        console.log('Application Ordre de Mission initialisée');
    },

    // Switch between views: 'new', 'history', 'users'
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        // Show the target view
        const target = document.getElementById('view-' + viewName);
        if (target) target.classList.add('active');
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        // If switching to history, refresh it
        if (viewName === 'history') {
            History.render();
        }
        // If switching to users, refresh the list
        if (viewName === 'users') {
            Users.renderUsersList();
        }
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
    },

    // Toggle sidebar on mobile
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    },

    // Set default dates on the form
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const dateDepart = document.getElementById('m-date-depart');
        const dateRetour = document.getElementById('m-date-retour');
        const dateCreation = document.getElementById('m-date-creation');
        if (dateDepart && !dateDepart.value) dateDepart.value = today;
        if (dateRetour && !dateRetour.value) dateRetour.value = today;
        if (dateCreation && !dateCreation.value) dateCreation.value = today;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
