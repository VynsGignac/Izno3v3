// script.js
// Initialisation des points ELO pour les joueurs et historique des matchs
let eloRatings = {};
let matchHistory = [];

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
		alert('Recup de FireBase 2');
        const data = snapshot.val();
        const container = document.getElementById('dataContainer');
        container.innerHTML = '<h2>Données depuis Firebase</h2>';

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
			alert('Recup de FireBase succès');
        } else {
            container.innerHTML += '<p>Aucune donnée disponible.</p>';
			alert('Recup de FireBase echec');
        }
    });
}

// Charger les données lorsque la page se charge
document.addEventListener('DOMContentLoaded', loadDataFromFirebase);{
	alert('Recup de FireBase');
}

// Charger les joueurs au chargement de la page
//document.addEventListener('DOMContentLoaded', loadPlayers);

// Sauvegarder les données dans localStorage
function saveData() {
    const matchData = { eloRatings, matchHistory };
    localStorage.setItem('matchData', JSON.stringify(matchData));
}

function saveDataToFirebase(data) {
	alert('Save vers FireBase');
  database.ref('matchData').set(data)
    .then(() => {
		alert('Data saved successfully.');
      console.log("Data saved successfully.");
    })
    .catch((error) => {
		alert("Error saving data: ", error);
      console.error("Error saving data: ", error);
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
    matchHistory.push({ date, team1, team2, result, eloChanges });

    // Sauvegarder les données dans localStorage
    saveData();
	console.log("try save Data");
	saveDataToFirebase(matchData);

    // Mettre à jour le menu déroulant des joueurs
    updatePlayerSelect();

    alert('Données enregistrées avec succès !');
});

document.getElementById('matchForm').addEventListener('submit', function(event) {	
  event.preventDefault();
	
  // Collectez les données du formulaire
  const matchData = {
    date: document.getElementById('date').value,
    team1: [
      document.getElementById('player1_1').value,
      document.getElementById('player1_2').value,
      document.getElementById('player1_3').value
    ],
    team2: [
      document.getElementById('player2_1').value,
      document.getElementById('player2_2').value,
      document.getElementById('player2_3').value
    ],
    result: document.getElementById('result').value
  };

  // Sauvegardez les données dans Firebase
  console.log("try save Data");
  saveDataToFirebase(matchData);

  alert('Données enregistrées avec succès !');
});

document.getElementById('showData').addEventListener('click', function() {
    const storedData = localStorage.getItem('matchData');

    if (storedData) {
        const matchData = JSON.parse(storedData);
        const sortedPlayers = Object.entries(matchData.eloRatings)
            .sort(([, elo1], [, elo2]) => elo2 - elo1);

        const storedDataDiv = document.getElementById('storedData');
        storedDataDiv.innerHTML = '<h2>Classement des Joueurs</h2>';

        sortedPlayers.forEach(([player, elo], index) => {
            storedDataDiv.innerHTML += `<p>${index + 1}. ${player} : ${Math.round(elo)} points</p>`;
        });
    } else {
        alert('Aucune donnée enregistrée.');
    }
});

document.getElementById('showMatches').addEventListener('click', function() {
    const storedData = localStorage.getItem('matchData');

    if (storedData) {
        const matchData = JSON.parse(storedData);
        const storedDataDiv = document.getElementById('storedData');
        storedDataDiv.innerHTML = '<h2>Historique des Matchs</h2>';

        matchData.matchHistory.forEach((match, index) => {
            storedDataDiv.innerHTML += `
                <div>
                    <p><strong>Match ${index + 1}:</strong> ${match.date} | Équipe 1: ${match.team1.join(', ')} | Équipe 2: ${match.team2.join(', ')} | Résultat: ${getResultText(match.result)}</p>
                </div>
            `;
        });
    } else {
        alert('Aucune donnée enregistrée.');
    }
});

document.getElementById('showPlayerMatches').addEventListener('click', function() {
    const playerName = document.getElementById('playerSelect').value;
    const storedData = localStorage.getItem('matchData');

    if (storedData && playerName) {
        const matchData = JSON.parse(storedData);
        const playerMatches = matchData.matchHistory.filter(match =>
            match.team1.includes(playerName) || match.team2.includes(playerName)
        );

        const storedDataDiv = document.getElementById('storedData');
        storedDataDiv.innerHTML = `<h2>Historique des matchs pour ${playerName}</h2>`;

        if (playerMatches.length > 0) {
            playerMatches.forEach((match, index) => {
                const eloChange = match.eloChanges[playerName] || 0;
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
        alert('Aucune donnée enregistrée ou aucun joueur sélectionné.');
    }
});

document.getElementById('clearData').addEventListener('click', function() {
    localStorage.removeItem('matchData');
    eloRatings = {};
    matchHistory = [];
    document.getElementById('storedData').innerHTML = '';
    document.getElementById('playerSelect').innerHTML = '<option value="">-- Sélectionnez un joueur --</option>';
    alert('Données effacées avec succès !');
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

