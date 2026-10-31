// Procedural 8-bit sound synthesizer
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx;

function initAudio() {
    if (!actx) actx = new AudioCtx();
}

const sfx = {
    jump: () => playTone(400, 'square', 0.1, 800),
    bump: () => playTone(150, 'sawtooth', 0.15, 100),
    explosion: () => playNoise(0.3),
    victory: () => {
        playTone(523.25, 'square', 0.15); // C5
        setTimeout(() => playTone(659.25, 'square', 0.15), 150); // E5
        setTimeout(() => playTone(783.99, 'square', 0.3), 300); // G5
    }
};

function playTone(freq, type, duration, endFreq = freq) {
    if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, actx.currentTime);
    if (freq !== endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, actx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(actx.destination);
    
    osc.start();
    osc.stop(actx.currentTime + duration);
}

function playNoise(duration) {
    if (!actx) return;
    const bufferSize = actx.sampleRate * duration;
    const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(actx.destination);
    noise.start();
}
