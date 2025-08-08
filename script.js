// script.js
// Initialisation des points ELO pour les joueurs et historique des matchs
let eloRatings = {};
let matchHistory = [];

const scriptVersion = "web 0.0.3";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
//const firebaseConfig = {
  //  apiKey: "AIzaSyBnnqJmvZCu76yMgpusBMt9bzhxOYFmz34",
    //authDomain: "izno3v3.firebaseapp.com",
    //projectId: "izno3v3",
    //storageBucket: "izno3v3.firebasestorage.app",
    //messagingSenderId: "826745105500",
    //appId: "1:826745105500:web:2b4bb29610bdcd890b0a99",
    //measurementId: "G-Y30ZRPT293"
  //};
  
const firebaseConfig = {
  apiKey: "AIzaSyBnnqJmvZCu76yMgpusBMt9bzhxOYFmz34",
  authDomain: "izno3v3.firebaseapp.com",
  databaseURL: "https://izno3v3-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "izno3v3",
  storageBucket: "izno3v3.firebasestorage.app",
  messagingSenderId: "826745105500",
  appId: "1:826745105500:web:2b4bb29610bdcd890b0a99",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

// Charger les joueurs depuis localStorage
function loadPlayers() {
    const storedData = localStorage.getItem('matchData');
    if (storedData) {
        const matchData = JSON.parse(storedData);
        eloRatings = matchData.eloRatings || {};
        matchHistory = matchData.matchHistory || [];
    }
}

function loadDataFromFirebase() {
    // Remplacez 'matchData' par le chemin correct vers vos données dans Firebase
	
    database.ref('matchData').on('value', (snapshot) => {
		//alert('Recup de FireBase 2');
        const data = snapshot.val();
        //const container = document.getElementById('dataContainer');
        //container.innerHTML = '<h2>Données depuis Firebase</h2>';
		
		const container = document.getElementById('dataContainer'); // Or use querySelector
		if (container) {
		  container.innerHTML = '<h2>Données depuis Firebase</h2>';
		} else {
		  console.error('Element with ID "dataContainer" not found.');
		}

        if (data) {
            Object.entries(data).forEach(([matchId, match]) => {
                const matchElement = document.createElement('div');
                matchElement.className = 'match-item';
                matchElement.innerHTML = `
                    <p><strong>Match ID:</strong> ${matchId}</p>
                    <p><strong>Date:</strong> ${match.date}</p>
                    <p><strong>Équipe 1:</strong> ${match.team1.join(', ')}</p>
                    <p><strong>Équipe 2:</strong> ${match.team2.join(', ')}</p>
                    <p><strong>Résultat:</strong> ${getResultText(match.result)}</p>
                    <hr>
                `;
                container.appendChild(matchElement);
            });
			//alert('Recup de FireBase succès');
        } else {
            container.innerHTML += '<p>Aucune donnée disponible.</p>';
			//alert('Recup de FireBase echec');
        }
    });
}

// Charger les données lorsque la page se charge
//document.addEventListener('DOMContentLoaded', loadDataFromFirebase);{alert('Recup de FireBase');}

// Charger les joueurs au chargement de la page
//document.addEventListener('DOMContentLoaded', loadPlayers);

// Sauvegarder les données dans localStorage
function saveData() {
    const matchData = { eloRatings, matchHistory };
    localStorage.setItem('matchData', JSON.stringify(matchData));
}

function saveDataToFirebase(data) {
    // Utiliser push() pour ajouter une nouvelle entrée sans écraser les données existantes
    database.ref('matchData').push(data)
        .then(() => {
            alert('Données enregistrées avec succès.');
            console.log("Données enregistrées avec succès.");
        })
        .catch((error) => {
            alert("Erreur lors de l'enregistrement des données : " + error);
            console.error("Erreur lors de l'enregistrement des données : ", error);
        });
}

// Mettre à jour le menu déroulant des joueurs
function updatePlayerSelect() {
    const playerSelect = document.getElementById('playerSelect');
    playerSelect.innerHTML = '<option value="">-- Sélectionnez un joueur --</option>';

    // Charger les joueurs depuis localStorage
    const storedData = localStorage.getItem('matchData');
    if (storedData) {
        const matchData = JSON.parse(storedData);
        const players = new Set();

        // Collecter tous les joueurs uniques
        if (matchData.matchHistory) {
            matchData.matchHistory.forEach(match => {
                match.team1.forEach(player => players.add(player));
                match.team2.forEach(player => players.add(player));
            });
        }

        // Ajouter les joueurs au menu déroulant
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerSelect.appendChild(option);
        });
    }
}

// Assurez-vous que currentMatchId est défini quelque part dans votre code
let currentMatchId = null; // Variable pour stocker l'ID du match en cours de modification

document.getElementById('matchForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const date = document.getElementById('date').value;
    const team1 = [
        document.getElementById('player1_1').value,
        document.getElementById('player1_2').value,
        document.getElementById('player1_3').value
    ];
    const team2 = [
        document.getElementById('player2_1').value,
        document.getElementById('player2_2').value,
        document.getElementById('player2_3').value
    ];
    const result = document.getElementById('result').value;

    // Initialiser les points ELO pour les nouveaux joueurs
    [...team1, ...team2].forEach(player => {
        if (!(player in eloRatings)) {
            eloRatings[player] = 1000;
        }
    });

    // Calculer les points ELO moyens pour chaque équipe
    const avgEloTeam1 = team1.reduce((sum, player) => sum + eloRatings[player], 0) / team1.length;
    const avgEloTeam2 = team2.reduce((sum, player) => sum + eloRatings[player], 0) / team2.length;

    // Calculer les nouveaux points ELO pour chaque joueur en fonction du résultat du match
    const K = 32;
    const expectedScoreTeam1 = 1 / (1 + Math.pow(10, (avgEloTeam2 - avgEloTeam1) / 400));
    const expectedScoreTeam2 = 1 / (1 + Math.pow(10, (avgEloTeam1 - avgEloTeam2) / 400));

    let actualScoreTeam1, actualScoreTeam2;
    if (result === 'team1') {
        actualScoreTeam1 = 1;
        actualScoreTeam2 = 0;
    } else if (result === 'team2') {
        actualScoreTeam1 = 0;
        actualScoreTeam2 = 1;
    } else { // match nul
        actualScoreTeam1 = 0.5;
        actualScoreTeam2 = 0.5;
    }

    // Stocker les variations de points ELO pour chaque joueur
    const eloChanges = {};
    const adjustElo = (team, actualScore, expectedScore) => {
        team.forEach(player => {
            const oldElo = eloRatings[player];
            eloRatings[player] += K * (actualScore - expectedScore);
            eloChanges[player] = Math.round(eloRatings[player] - oldElo);
        });
    };

    adjustElo(team1, actualScoreTeam1, expectedScoreTeam1);
    adjustElo(team2, actualScoreTeam2, expectedScoreTeam2);

    // Ajouter le match à l'historique avec les variations de points ELO
    const matchData = { date, team1, team2, result, eloChanges };

    const submitButton = document.querySelector('#matchForm button[type="submit"]');

    if (submitButton.textContent === 'Modifier') {
        // Mettre à jour le match existant dans Firebase
        database.ref(`matchData/${currentMatchId}`).update(matchData)
            .then(() => {
                alert('Match mis à jour avec succès.');
                resetForm();
            })
            .catch((error) => {
                console.error("Erreur lors de la mise à jour du match : ", error);
                alert('Erreur lors de la mise à jour du match.');
            });
			document.getElementById('showMatches').click();
    } else {
        // Ajouter un nouveau match dans Firebase
        saveDataToFirebase(matchData);
    }
	populatePlayerSelect();
	
});

// Fonction pour réinitialiser le formulaire
function resetForm() {
    document.getElementById('matchForm').reset();
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('date').value = formattedDate;
    const submitButton = document.querySelector('#matchForm button[type="submit"]');
    submitButton.textContent = 'Soumettre';
    currentMatchId = null;
}

document.getElementById('showData').addEventListener('click', function() {
    // Récupérer les données depuis Firebase
    firebase.database().ref('matchData').once('value')
        .then((snapshot) => {
            const matchData = snapshot.val();

            if (matchData) {
                // Calculer les classements ELO à partir des données récupérées
                const playerRatings = calculateEloRatings(matchData);

                // Trier les joueurs par classement ELO
                const sortedPlayers = Object.entries(playerRatings)
                    .sort(([, elo1], [, elo2]) => elo2 - elo1);

                // Afficher les classements des joueurs
                const storedDataDiv = document.getElementById('storedData');
                storedDataDiv.innerHTML = '<h2>Classement des Joueurs</h2>';

                sortedPlayers.forEach(([player, elo], index) => {
                    storedDataDiv.innerHTML += `<p>${index + 1}. ${player} : ${Math.round(elo)} points</p>`;
                });
            } else {
                alert('Aucune donnée enregistrée dans Firebase.');
            }
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération des données depuis Firebase : ", error);
            alert('Erreur lors de la récupération des données.');
        });
});

// Fonction pour calculer les classements ELO à partir des données des matchs
function calculateEloRatings(matches) {
    const playerRatings = {};

    // Initialiser chaque joueur avec un classement ELO de départ
    Object.values(matches).forEach(match => {
        [...match.team1, ...match.team2].forEach(player => {
            if (!playerRatings[player]) {
                playerRatings[player] = 1000; // Classement ELO initial
            }
        });
    });

    // Mettre à jour les classements ELO en fonction des résultats des matchs
    Object.values(matches).forEach(match => {
        if (match.team1 && Array.isArray(match.team1) && match.team2 && Array.isArray(match.team2)) {
            const { team1, team2, result } = match;

            // Calculer la moyenne des classements ELO pour chaque équipe
            const avgTeam1Rating = team1.reduce((sum, player) => sum + playerRatings[player], 0) / team1.length;
            const avgTeam2Rating = team2.reduce((sum, player) => sum + playerRatings[player], 0) / team2.length;

            // Calculer les scores attendus
            const expectedScoreTeam1 = 1 / (1 + Math.pow(10, (avgTeam2Rating - avgTeam1Rating) / 400));
            const expectedScoreTeam2 = 1 / (1 + Math.pow(10, (avgTeam1Rating - avgTeam2Rating) / 400));

            // Déterminer les scores réels en fonction du résultat du match
            let actualScoreTeam1, actualScoreTeam2;
            if (result === 'team1') {
                actualScoreTeam1 = 1;
                actualScoreTeam2 = 0;
            } else if (result === 'team2') {
                actualScoreTeam1 = 0;
                actualScoreTeam2 = 1;
            } else { // match nul
                actualScoreTeam1 = 0.5;
                actualScoreTeam2 = 0.5;
            }

            // Constante K qui détermine l'impact d'un match sur le classement ELO
            const K = 32;

            // Mettre à jour les classements ELO des joueurs
            team1.forEach(player => {
                playerRatings[player] += K * (actualScoreTeam1 - expectedScoreTeam1);
            });

            team2.forEach(player => {
                playerRatings[player] += K * (actualScoreTeam2 - expectedScoreTeam2);
            });
        } else {
            console.warn("match.team1 or match.team2 is not an iterable array for match:", match);
        }
    });

    return playerRatings;
}


// Fonction pour afficher les matchs
document.getElementById('showMatches').addEventListener('click', function() {
    firebase.database().ref('matchData').once('value')
        .then((snapshot) => {
            const matches = snapshot.val();
            const storedDataDiv = document.getElementById('storedData');

            if (matches) {
                storedDataDiv.innerHTML = '<h2>Historique des Matchs</h2>';

                Object.entries(matches).forEach(([matchId, match], index) => {
                    const matchElement = document.createElement('div');
                    matchElement.className = 'match-item';
                    matchElement.innerHTML = `
                        <div>
                            <p><strong>Match ${index + 1}:</strong> ${match.date || 'Date inconnue'} | Équipe 1: ${match.team1 ? match.team1.join(', ') : 'Inconnu'} | Équipe 2: ${match.team2 ? match.team2.join(', ') : 'Inconnu'} | Résultat: ${getResultText(match.result)}</p>
                        </div>
                        <div>
                            <button class="edit-button" onclick="editMatch('${matchId}')">Modifier</button>
							<button class="delete-button" onclick="deleteMatch('${matchId}')">Supprimer</button>
                        </div>
                    `;
                    storedDataDiv.appendChild(matchElement);
                });
            } else {
                storedDataDiv.innerHTML = '<p>Aucune donnée enregistrée dans Firebase.</p>';
            }
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération des données depuis Firebase : ", error);
            alert('Erreur lors de la récupération des données.');
        });
});

document.getElementById('showPlayerMatches').addEventListener('click', function() {
    const playerName = document.getElementById('playerSelect').value;

    if (playerName) {
        // Récupérer les données depuis Firebase
        firebase.database().ref('matchData').once('value')
            .then((snapshot) => {
                const matches = snapshot.val();

                if (matches) {
                    // Filtrer les matchs pour le joueur sélectionné
                    const playerMatches = Object.entries(matches).map(([matchId, match]) => ({ matchId, ...match }))
                        .filter(match =>
                            match.team1.includes(playerName) || match.team2.includes(playerName)
                        );

                    const storedDataDiv = document.getElementById('storedData');
                    storedDataDiv.innerHTML = `<h2>Historique des matchs pour ${playerName}</h2>`;

                    if (playerMatches.length > 0) {
                        playerMatches.forEach((match, index) => {
                            // Calculer le changement ELO pour le joueur
                            const eloChange = match.eloChanges ? match.eloChanges[playerName] : 0;
                            const eloChangeText = eloChange >= 0 ? `+${eloChange}` : `${eloChange}`;

                            storedDataDiv.innerHTML += `
                                <div>
                                    <p><strong>Match ${index + 1}:</strong> ${match.date} | Équipe 1: ${match.team1.join(', ')} | Équipe 2: ${match.team2.join(', ')} | Résultat: ${getResultText(match.result)} | Points ELO: ${eloChangeText}</p>
                                </div>
                            `;
                        });
                    } else {
                        storedDataDiv.innerHTML += `<p>Aucun match trouvé pour ce joueur.</p>`;
                    }
                } else {
                    alert('Aucune donnée enregistrée dans Firebase.');
                }
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération des données depuis Firebase : ", error);
                alert('Erreur lors de la récupération des données.');
            });
    } else {
        alert('Aucun joueur sélectionné.');
    }
});

// Fonction pour récupérer les joueurs depuis Firebase et remplir la liste déroulante
function populatePlayerSelect() {
    firebase.database().ref('matchData').once('value')
        .then((snapshot) => {
            const matches = snapshot.val();
            const players = new Set(); // Utiliser un Set pour éviter les doublons

            if (matches) {
                // Parcourir tous les matchs et collecter les noms des joueurs
                Object.values(matches).forEach(match => {
                    if (match.team1) {
                        match.team1.forEach(player => players.add(player));
                    }
                    if (match.team2) {
                        match.team2.forEach(player => players.add(player));
                    }
                });
            }

            // Remplir la liste déroulante avec les joueurs
            const playerSelect = document.getElementById('playerSelect');
            playerSelect.innerHTML = '<option value="">-- Sélectionnez un joueur --</option>'; // Option par défaut

            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player;
                option.textContent = player;
                playerSelect.appendChild(option);
            });
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération des joueurs depuis Firebase : ", error);
            alert('Erreur lors de la récupération des joueurs.');
        });
}

// Appeler la fonction pour remplir la liste déroulante lorsque la page se charge
document.addEventListener('DOMContentLoaded', populatePlayerSelect);

document.getElementById('clearData').addEventListener('click', function() {
    // Supprimer les données de Firebase
    firebase.database().ref('matchData').remove()
        .then(() => {
            // Réinitialiser les variables locales
            eloRatings = {};
            matchHistory = [];

            // Réinitialiser l'affichage
            document.getElementById('storedData').innerHTML = '';
            document.getElementById('playerSelect').innerHTML = '<option value="">-- Sélectionnez un joueur --</option>';

            alert('Données effacées avec succès de Firebase !');
        })
        .catch((error) => {
            console.error("Erreur lors de la suppression des données de Firebase : ", error);
            alert('Erreur lors de la suppression des données.');
        });
});



// Fonction pour obtenir le texte du résultat
function getResultText(result) {
    switch(result) {
        case 'team1':
            return 'Équipe 1 gagne';
        case 'team2':
            return 'Équipe 2 gagne';
        case 'draw':
            return 'Match nul';
        default:
            return 'Inconnu';
    }
}

function deleteMatch(matchId) {
  // Supprimer le match de la base de données
  database.ref(`matchData/${matchId}`).remove()
    .then(() => {
      console.log("Match supprimé avec succès.");
      // Recalculer les classements ELO après la suppression
      recalculateEloRatings();
    })
    .catch((error) => {
      console.error("Erreur lors de la suppression du match : ", error);
    });
}

async function recalculateEloRatings() {
  // Charger tous les matchs restants
  const snapshot = await database.ref('matchData').once('value');
  const matches = snapshot.val();

  // Réinitialiser les points ELO
  const players = new Set();
  Object.values(matches).forEach(match => {
    match.team1.forEach(player => players.add(player));
    match.team2.forEach(player => players.add(player));
  });

  let eloRatings = {};
  players.forEach(player => {
    eloRatings[player] = 1000; // Réinitialiser à la valeur initiale
  });

  // Recalculer les points ELO pour chaque match restant
  Object.values(matches).forEach(match => {
    const { team1, team2, result } = match;

    const avgEloTeam1 = team1.reduce((sum, player) => sum + eloRatings[player], 0) / team1.length;
    const avgEloTeam2 = team2.reduce((sum, player) => sum + eloRatings[player], 0) / team2.length;

    const K = 32;
    const expectedScoreTeam1 = 1 / (1 + Math.pow(10, (avgEloTeam2 - avgEloTeam1) / 400));
    const expectedScoreTeam2 = 1 / (1 + Math.pow(10, (avgEloTeam1 - avgEloTeam2) / 400));

    let actualScoreTeam1, actualScoreTeam2;
    if (result === 'team1') {
      actualScoreTeam1 = 1;
      actualScoreTeam2 = 0;
    } else if (result === 'team2') {
      actualScoreTeam1 = 0;
      actualScoreTeam2 = 1;
    } else { // match nul
      actualScoreTeam1 = 0.5;
      actualScoreTeam2 = 0.5;
    }

    // Mettre à jour les points ELO
    team1.forEach(player => {
      eloRatings[player] += K * (actualScoreTeam1 - expectedScoreTeam1);
    });

    team2.forEach(player => {
      eloRatings[player] += K * (actualScoreTeam2 - expectedScoreTeam2);
    });
  });

  // Mettre à jour les points ELO dans votre application
  updateEloRatingsInApp(eloRatings);
}

function updateEloRatingsInApp(eloRatings) {
  // Mettre à jour l'affichage des points ELO dans votre application
  console.log("Nouveaux classements ELO :", eloRatings);
  // Vous pouvez mettre à jour votre interface utilisateur ici
}



// Fonction pour afficher la version dans le DOM
function displayVersion() {
    const versionElement = document.getElementById('version');
    if (versionElement) {
        versionElement.textContent = `Version: ${scriptVersion}`;
    }
}


// Fonction pour gérer le clic sur le bouton "Annuler"
document.getElementById('cancelButton').addEventListener('click', function() {
    resetForm();
});

// Fonction pour réinitialiser le formulaire
function resetForm() {
    document.getElementById('matchForm').reset();
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('date').value = formattedDate;
    const submitButton = document.querySelector('#matchForm button[type="submit"]');
    submitButton.textContent = 'Soumettre';
    currentMatchId = null;
}

// Fonction pour gérer le clic sur le bouton "Supprimer"
function deleteMatch(matchId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce match ?")) {
        database.ref(`matchData/${matchId}`).remove()
            .then(() => {
                alert('Match supprimé avec succès.');
				populatePlayerSelect();
                document.getElementById('showMatches').click(); // Rafraîchir l'affichage
            })
            .catch((error) => {
                console.error("Erreur lors de la suppression du match : ", error);
                alert('Erreur lors de la suppression du match.');
            });
    }
}

// Fonction pour gérer le clic sur le bouton "Modifier"
function editMatch(matchId) {
    currentMatchId = matchId;
    database.ref(`matchData/${matchId}`).once('value')
        .then((snapshot) => {
            const match = snapshot.val();
            // Charger les données du match dans le formulaire
            document.getElementById('date').value = match.date || '';
            document.getElementById('player1_1').value = match.team1[0] || '';
            document.getElementById('player1_2').value = match.team1[1] || '';
            document.getElementById('player1_3').value = match.team1[2] || '';
            document.getElementById('player2_1').value = match.team2[0] || '';
            document.getElementById('player2_2').value = match.team2[1] || '';
            document.getElementById('player2_3').value = match.team2[2] || '';
            document.getElementById('result').value = match.result || '';

            // Changer le texte du bouton de soumission
            const submitButton = document.querySelector('#matchForm button[type="submit"]');
            submitButton.textContent = 'Modifier';
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération des données du match : ", error);
            alert('Erreur lors de la récupération des données du match.');
        });
}
// Appeler la fonction pour afficher la version lorsque la page se charge
document.addEventListener('DOMContentLoaded', displayVersion);