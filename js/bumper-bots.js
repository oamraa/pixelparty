// Bumper Bots - Sumo Battle Royale Logic
class BumperBots {
    constructor(canvas, network) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.net = network;
        this.animationId = null;
        
        // Physics constants
        this.arenaRadius = 250;
        this.friction = 0.96;
        this.acceleration = 0.5;
        this.bounce = 1.2; // Elasticity of collisions
        
        // Input state
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        this.peerKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        
        // Game state (Authoritative on Host)
        this.state = {
            p1: { x: 300, y: 300, vx: 0, vy: 0, radius: 25, color: '#d946ef' }, // Host (Fuchsia)
            p2: { x: 500, y: 300, vx: 0, vy: 0, radius: 25, color: '#22d3ee' }, // Client (Cyan)
            status: 'playing',
            winner: null
        };

        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                if (!this.net.isHost) this.net.send({ type: 'input', keys: this.keys });
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
                if (!this.net.isHost) this.net.send({ type: 'input', keys: this.keys });
            }
        });

        // Network listener for the game loop
        this.net.onDataCallback = (data) => {
            if (this.net.isHost && data.type === 'input') {
                this.peerKeys = data.keys; // Host receives client inputs
            } else if (!this.net.isHost && data.type === 'state') {
                this.state = data.state; // Client receives absolute physics state
                if (data.playSound) sfx[data.playSound]();
            }
        };
    }

    start() {
        initAudio();
        this.loop();
    }

    updatePhysics() {
        if (this.state.status !== 'playing') return;

        // Apply Host Inputs (P1)
        if (this.keys.ArrowUp) this.state.p1.vy -= this.acceleration;
        if (this.keys.ArrowDown) this.state.p1.vy += this.acceleration;
        if (this.keys.ArrowLeft) this.state.p1.vx -= this.acceleration;
        if (this.keys.ArrowRight) this.state.p1.vx += this.acceleration;

        // Apply Client Inputs (P2)
        if (this.peerKeys.ArrowUp) this.state.p2.vy -= this.acceleration;
        if (this.peerKeys.ArrowDown) this.state.p2.vy += this.acceleration;
        if (this.peerKeys.ArrowLeft) this.state.p2.vx -= this.acceleration;
        if (this.peerKeys.ArrowRight) this.state.p2.vx += this.acceleration;

        // Apply Friction & Velocity
        ['p1', 'p2'].forEach(p => {
            this.state[p].vx *= this.friction;
            this.state[p].vy *= this.friction;
            this.state[p].x += this.state[p].vx;
            this.state[p].y += this.state[p].vy;
        });

        // Circle Collision Detection between players
        const dx = this.state.p2.x - this.state.p1.x;
        const dy = this.state.p2.y - this.state.p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.state.p1.radius + this.state.p2.radius;

        if (distance < minDist) {
            // Collision resolution
            const angle = Math.atan2(dy, dx);
            const targetX = this.state.p1.x + Math.cos(angle) * minDist;
            const targetY = this.state.p1.y + Math.sin(angle) * minDist;
            const ax = (targetX - this.state.p2.x) * this.bounce;
            const ay = (targetY - this.state.p2.y) * this.bounce;

            this.state.p1.vx -= ax;
            this.state.p1.vy -= ay;
            this.state.p2.vx += ax;
            this.state.p2.vy += ay;

            sfx.bump();
            this.net.send({ type: 'state', state: this.state, playSound: 'bump' });
        }

        // Ring Out Detection (Center is 400, 300)
        ['p1', 'p2'].forEach(p => {
            const distFromCenter = Math.sqrt((this.state[p].x - 400)**2 + (this.state[p].y - 300)**2);
            if (distFromCenter > this.arenaRadius) {
                this.state.status = 'gameover';
                this.state.winner = p === 'p1' ? 'Player 2 (Cyan)' : 'Player 1 (Fuchsia)';
                sfx.explosion();
                setTimeout(() => sfx.victory(), 500);
                this.net.send({ type: 'state', state: this.state, playSound: 'explosion' });
            }
        });

        // Broadcast authoritative state
        this.net.send({ type: 'state', state: this.state });
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#111827'; // Tailwind gray-900
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Arena Space
        this.ctx.beginPath();
        this.ctx.arc(400, 300, this.arenaRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1f2937'; // Tailwind gray-800
        this.ctx.fill();
        this.ctx.strokeStyle = '#ef4444'; // Red edge
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // Draw Players
        ['p1', 'p2'].forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(this.state[p].x, this.state[p].y, this.state[p].radius, 0, Math.PI * 2);
            this.ctx.fillStyle = this.state[p].color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        // Draw Game Over Screen
        if (this.state.status === 'gameover') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.state.winner} WINS!`, 400, 300);
        }
    }

    loop() {
        if (this.net.isHost) this.updatePhysics();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }
}
