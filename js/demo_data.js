if (!localStorage.getItem('ordre_mission_users')) {
    localStorage.setItem('ordre_mission_users', JSON.stringify([{"id":"user_ayoub","direction":"OUEZZANE","fonction":"Conducteur de Travaux","nom":"DARRAGE Ayoub","province":"OUEZZANE","division":"Etude et Travaux Réseaux Electricité","matricule":"83 182 D","departement":"Etude et Travaux"}]));
    localStorage.setItem('ordre_mission_active_user', 'user_ayoub');
}
if (!localStorage.getItem('ordre_mission_missions')) {
    localStorage.setItem('ordre_mission_missions', JSON.stringify([{"userId":"user_ayoub","id":"mission_demo_1","lieuDeplacement":"AIN BIDA","heureDepart":"08:00","heureRetour":"21:30","createdAt":"2026-08-06T08:00:00.000Z","vehiculeService":true,"agent":{"direction":"OUEZZANE","fonction":"Conducteur de Travaux","province":"OUEZZANE","departement":"Etude et Travaux","division":"Etude et Travaux Réseaux Electricité","matricule":"83 182 D","nom":"DARRAGE Ayoub"},"vehiculePersoMarque":"","dateCreation":"2026-08-06","dateRetour":"2026-08-06","vehiculePerso":false,"motifDeplacement":"Validation des tracés relatifs au remplacement des supports au sol","transportCommun":false,"covoiturage":false,"dateDepart":"2026-08-06","kilometrage":"120","vehiculeServiceNum":"6533/Y/6","puissanceFiscale":"","lieuCreation":"OUEZZANE"}]));
}
