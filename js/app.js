// Handles DOM interactions and game instantiation
document.addEventListener('DOMContentLoaded', () => {
    const btnHost = document.getElementById('btn-host');
    const btnJoin = document.getElementById('btn-join');
    const joinCodeInput = document.getElementById('join-code');
    const gameSelection = document.getElementById('game-selection');
    const lobbyUi = document.getElementById('lobby-ui');
    const gameUi = document.getElementById('game-ui');
    const btnPlayBots = document.getElementById('btn-play-bots');
    
    let activeGame = null;

    // Host Flow
    btnHost.addEventListener('click', () => {
        btnHost.innerText = "Generating...";
        network.hostGame((code) => {
            document.getElementById('room-code-display').classList.remove('hidden');
            document.getElementById('code-span').innerText = code;
            btnHost.innerText = "Waiting for Player...";
            btnHost.disabled = true;
        });
    });

    // Join Flow
    btnJoin.addEventListener('click', () => {
        const code = joinCodeInput.value.trim();
        if (code.length === 5) {
            btnJoin.innerText = "Connecting...";
            network.joinGame(code);
        } else {
            alert("Please enter a valid 5-character room code.");
        }
    });

    // On Successful P2P Connection
    network.onConnectCallback = () => {
        document.getElementById('room-code-display').classList.add('hidden');
        btnHost.parentElement.classList.add('hidden');
        btnJoin.parentElement.classList.add('hidden');
        gameSelection.classList.remove('hidden');
        document.getElementById('player-role-display').innerText = network.isHost ? "Role: HOST (Fuchsia)" : "Role: CLIENT (Cyan)";
    };

    // Start Game
    btnPlayBots.addEventListener('click', () => {
        // Host tells client to start game
        if (network.isHost) network.send({ type: 'start_game', game: 'bots' });
        loadGame('bots');
    });

    // Handle incoming UI commands
    const originalDataCallback = network.onDataCallback;
    network.onDataCallback = (data) => {
        if (data.type === 'start_game' && !network.isHost) loadGame(data.game);
        if (activeGame && activeGame.net.onDataCallback) activeGame.net.onDataCallback(data);
    };

    function loadGame(gameType) {
        lobbyUi.classList.add('hidden');
        gameUi.classList.remove('hidden');
        gameUi.classList.add('flex');
        
        const canvas = document.getElementById('gameCanvas');
        if (gameType === 'bots') {
            activeGame = new BumperBots(canvas, network);
            activeGame.start();
        }
    }

    document.getElementById('btn-leave').addEventListener('click', () => location.reload());
});
