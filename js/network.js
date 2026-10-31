// Manages WebRTC Peer-to-Peer Connections using PeerJS
class NetworkManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.onConnectCallback = null;
        this.onDataCallback = null;
    }

    hostGame(onReady) {
        this.isHost = true;
        // Generate a simple 5-character alphanumeric room code
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        this.peer = new Peer(`pixelparty-${roomCode}`);
        
        this.peer.on('open', (id) => onReady(roomCode));
        
        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
        });
    }

    joinGame(roomCode) {
        this.isHost = false;
        this.peer = new Peer();
        
        this.peer.on('open', (id) => {
            this.connection = this.peer.connect(`pixelparty-${roomCode.toUpperCase()}`);
            this.setupConnection();
        });
    }

    setupConnection() {
        this.connection.on('open', () => {
            if (this.onConnectCallback) this.onConnectCallback();
        });
        
        this.connection.on('data', (data) => {
            if (this.onDataCallback) this.onDataCallback(data);
        });

        this.connection.on('close', () => {
            alert("Peer disconnected.");
            location.reload();
        });
    }

    send(data) {
        if (this.connection && this.connection.open) {
            this.connection.send(data);
        }
    }
}

const network = new NetworkManager();
