const PORT = process.env.PORT || 4444;

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const lobbyManager = require('./server/lobbymanager.js')(io);
const Lobby = require('./server/lobby.js');
const Player = require('./server/player.js');

app.get('/', function (request, response) {
	response.sendFile(__dirname + '/client/index.html');
});

app.use('/client/', express.static(__dirname + '/client/'));


function createLobby(data) {

	if (!data) {
		console.error('No data! Invalid create-lobby request!');
		return;
	}

	// Check if this player is already in a lobby
	if (this.lobby) {
		disconnect.bind(this)();
	}

	var lobby = lobbyManager.createLobby();
	data.id = lobby.id;
	joinLobby.bind(this, data)();
}

function joinLobby(data) {

	if (!data) {
		console.error('No data! Invalid join-lobby request!');
		return;
	}

	let { id, playerName } = data;
	var lobby = lobbyManager.getLobby(id);
	if (!lobby) {
		this.emit('lobby-not-exist');
		return;
	}

	if (playerName) {
		this.player.name = playerName;
	}
	lobby.addPlayer(this.player);
	this.join(id);

	this.emit('lobby-joined', {
		players: lobby.players,
		inGame: lobby.inGame,
		lobbyID: id
	});

	this.lobby = lobby;

	io.sockets.in(id).emit('update-game', {
		players: lobby.players,
		candy: lobby.game.candy,
		inGame: lobby.inGame
	});

	this.on('disconnect', disconnect);

	this.on('lobby-start', lobbyStart);

	this.on('new-direction', newDirection);
}

function joinAnyLobby() {
	// If there aren't any lobbies to join, create a new one
	if (lobbyManager.lobbyCount < 1) {
		let lobby = lobbyManager.createLobby();
		this.emit('found-lobby', lobby.id);
	} else {
		let bestLobby = null;
		// Loop through each lobby to find the lobby that is the most full
		for (prop in lobbyManager.lobbies) {
			let lobby = lobbyManager.lobbies[prop];
			// If the lobby has space and is more full
			if (lobby.playerSpace > 0 && lobby.playerSpace < (!!bestLobby ? bestLobby.playerSpace : Infinity)) {
				bestLobby = lobby;
			}
		}
		// If we didn't find a suitable lobby, create a new one
		if (!bestLobby) {
			bestLobby = lobbyManager.createLobby();
		}
		this.emit('found-lobby', bestLobby.id);
	}
}

function disconnect() {
	var lobby = this.lobby;
	lobby.removePlayer(this.id);
	if (lobby.playerCount < 1) {
		console.log(`Lobby ${lobby.id} is empty`);
		lobbyManager.removeLobby(lobby.id);
	} else {
		io.sockets.in(lobby.id).emit('update-game', {
			players: lobby.players,
			candy: lobby.game.candy,
			inGame: lobby.inGame
		});
		if (!lobby.hasEnoughPlayers) {
			lobby.stopGame();
			io.sockets.in(lobby.id).emit('game-end', {
				players: lobby.players,
				candy: lobby.game.candy,
				lobbyID: lobby.id
			});
		}
	}
}

function lobbyStart() {
	var lobby = this.lobby;
	if (this.player.isHost && lobby.hasEnoughPlayers) {
		lobby.startGame();
		io.sockets.in(lobby.id).emit('game-start');
	}
}

function newDirection(direction) {
	var lobby = this.lobby;
	lobby.players[this.id].direction = direction;
	io.sockets.in(this.lobby.id).emit('update-game', {
		players: lobby.players,
		candy: lobby.game.candy,
		inGame: lobby.inGame
	});
}


io.sockets.on('connection', function(socket) {

	socket.player = new Player(socket.id);

	console.log(`New connection with id ${socket.id}`);

	socket.on('create-lobby', createLobby);

	socket.on('join-any-lobby', joinAnyLobby);

	socket.on('join-lobby', joinLobby);

});

// connection request
// wait for "join-lobby" request
	// if game is full, respond with "lobby-full" and don't add
	// if game is in progress, assign them as a spectator
	// otherwise, add them
	// send them a success response so player renders the lobby page
	// wait for "start-game" request
		// if the request was from the host, start the game
		// if not, ignore it or send a response saying only the host can start the game

// disconnect request
// check if the player was in a lobby
	// if yes, remove them from it
	// if the player was the host, check if there is anyone else in the lobby
		// if yes, then assign a new player to be host
		// if not, delete the lobby

// start game
// generate and send snake locations, make sure they don't overlap
// spawn one candy, make sure it doesn't overlap any snake
// create a game loop for the lobby
	// update the direction and position

// input/direction-change request
// verify that the direction is valid (number that is either 1, -1, 2, or -2)
// verify that the new direction is valid
	// if yes, update the "new" direction
	// if not, don't do anything/send wrong way response

server.listen(PORT, function() {
	console.log(`Server started on port ${PORT}!`);
});