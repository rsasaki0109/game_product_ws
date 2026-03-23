let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.12) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + duration)
}

function playNoise(duration: number, volume = 0.08) {
  const c = getCtx()
  const bufferSize = c.sampleRate * duration
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() - 0.5) * 2
  const source = c.createBufferSource()
  source.buffer = buffer
  const gain = c.createGain()
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  source.connect(gain).connect(c.destination)
  source.start()
}

export function jump() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.08)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.08)
}

export function coinCollect() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, c.currentTime)
  osc.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.06)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.06)
}

export function obstacleHit() {
  playTone(150, 0.1, 'square', 0.12)
  playNoise(0.1, 0.08)
}

export function pushSound() {
  playNoise(0.08, 0.08)
  playTone(200, 0.08, 'square', 0.10)
}

export function coverEyes() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(500, c.currentTime)
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}

export function pillowHit() {
  playNoise(0.1, 0.06)
  playTone(300, 0.1, 'triangle', 0.10)
}

export function tickleSound() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(800, c.currentTime)
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.04)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.08)
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.12)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.12)
}

export function finish() {
  const c = getCtx()
  const t = c.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = [500, 700, 900][i]
    gain.gain.setValueAtTime(0, t + i * 0.1)
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.1); osc.stop(t + 0.3)
  }
}

/** Whoosh ascending - speed pad activation */
export function speedPad() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.08, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.2)
  // Add noise layer for whoosh
  playNoise(0.15, 0.05)
}

/** Magical sparkle - power-up collected */
export function powerUp() {
  const c = getCtx()
  const t = c.currentTime
  const notes = [900, 1100, 1400, 1800]
  for (let i = 0; i < notes.length; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = notes[i]
    gain.gain.setValueAtTime(0, t + i * 0.04)
    gain.gain.linearRampToValueAtTime(0.1, t + i * 0.04 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.12)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.12)
  }
}

/** Tense heartbeat-like pulse - close race indicator */
export function closeRace() {
  const c = getCtx()
  const t = c.currentTime
  // Two quick thumps like a heartbeat
  for (let i = 0; i < 2; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(60, t + i * 0.15)
    osc.frequency.exponentialRampToValueAtTime(30, t + i * 0.15 + 0.1)
    gain.gain.setValueAtTime(0, t + i * 0.15)
    gain.gain.linearRampToValueAtTime(0.15, t + i * 0.15 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.12)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.12)
  }
}

/** Dramatic drum roll - photo finish */
export function photoFinish() {
  const c = getCtx()
  const t = c.currentTime
  // Rapid ascending hits
  for (let i = 0; i < 8; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    const freq = 200 + i * 80
    osc.frequency.value = freq
    const start = t + i * 0.06
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.08 + i * 0.01, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08)
    osc.connect(gain).connect(c.destination)
    osc.start(start); osc.stop(start + 0.08)
  }
  // Final crash
  const finalT = t + 0.5
  playTone(100, 0.3, 'sawtooth', 0.12)
  const osc2 = c.createOscillator()
  const gain2 = c.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 800
  gain2.gain.setValueAtTime(0, finalT)
  gain2.gain.linearRampToValueAtTime(0.14, finalT + 0.01)
  gain2.gain.exponentialRampToValueAtTime(0.001, finalT + 0.4)
  osc2.connect(gain2).connect(c.destination)
  osc2.start(finalT); osc2.stop(finalT + 0.4)
}

/** Ramp bounce sound */
export function rampBounce() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.1)
  gain.gain.setValueAtTime(0.1, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.12)
}
