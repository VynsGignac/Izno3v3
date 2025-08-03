const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Charger les données des joueurs
function loadPlayers() {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

// Sauvegarder les données des joueurs
function savePlayers(players) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
}

// Calculer les nouveaux classements ELO
function calculateNewElo(winnerTeam, loserTeam, kFactor = 32) {
    const winnerAverageElo = winnerTeam.reduce((sum, player) => sum + player.elo_rating, 0) / winnerTeam.length;
    const loserAverageElo = loserTeam.reduce((sum, player) => sum + player.elo_rating, 0) / loserTeam.length;

    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserAverageElo - winnerAverageElo) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerAverageElo - loserAverageElo) / 400));

    winnerTeam.forEach(player => {
        player.elo_rating += kFactor * (1 - expectedScoreWinner);
    });

    loserTeam.forEach(player => {
        player.elo_rating += kFactor * (0 - expectedScoreLoser);
    });
}

// Endpoint pour calculer les nouveaux classements ELO
app.post('/calculate_elo', (req, res) => {
    const { team1, team2, winner } = req.body;
    let players = loadPlayers();

    const team1Players = team1.map(name => players.find(player => player.name === name));
    const team2Players = team2.map(name => players.find(player => player.name === name));

    if (winner === 1) {
        calculateNewElo(team1Players, team2Players);
    } else {
        calculateNewElo(team2Players, team1Players);
    }

    savePlayers(players);
    res.json({ message: 'Classements ELO mis à jour' });
});

// Endpoint pour obtenir les résultats
app.get('/get_results', (req, res) => {
    const players = loadPlayers();
    res.json(players.sort((a, b) => b.elo_rating - a.elo_rating));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
