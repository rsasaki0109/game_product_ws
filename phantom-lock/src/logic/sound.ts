let ctx: AudioContext | null = null
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
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

function playNoise(duration: number, volume = 0.1) {
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

/** Lock-on beep - pitch increases with each additional lock */
export function lockOn(lockCount = 1) {
  const baseFreq = 800 + lockCount * 100 // Higher pitch for more locks
  playTone(Math.min(2000, baseFreq), 0.03, 'square', 0.1)
}

export function lockBurst() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}

export function missileHit() {
  playNoise(0.08, 0.1)
  playTone(200, 0.1)
}

export function quickShot() {
  playTone(600, 0.05, 'square', 0.08)
}

export function playerHurt() {
  playTone(100, 0.15)
  playNoise(0.15, 0.1)
}

export function enemyDeath() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.2)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.2)
  playNoise(0.15, 0.08)
}

export function dashSound() {
  const c = getCtx()
  const bufferSize = c.sampleRate * 0.15
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() - 0.5) * 2
  const source = c.createBufferSource()
  source.buffer = buffer
  const gain = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1000
  filter.Q.value = 0.5
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  source.connect(filter).connect(gain).connect(c.destination)
  source.start()
}

export function waveStart() {
  const c = getCtx()
  const freqs = [400, 800, 400]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.1
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.1)
  })
}

/** Escalating tone per lock count - higher pitch for more locks */
export function multiLockAchieve(lockCount: number) {
  const c = getCtx()
  const baseFreq = 600
  for (let i = 0; i < Math.min(lockCount, 8); i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = baseFreq + i * 150
    const t = c.currentTime + i * 0.04
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.08)
  }
}

/** Rapid ascending notes for chain kill */
export function chainKill() {
  const c = getCtx()
  const freqs = [500, 700, 900, 1100, 1400]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.035
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.06)
  })
}

/** Triumphant fanfare for wave clear */
export function waveClear() {
  const c = getCtx()
  const notes = [
    { freq: 523, delay: 0, dur: 0.15 },      // C5
    { freq: 659, delay: 0.12, dur: 0.15 },    // E5
    { freq: 784, delay: 0.24, dur: 0.15 },    // G5
    { freq: 1047, delay: 0.36, dur: 0.3 },    // C6 (held)
  ]
  notes.forEach(note => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = note.freq
    const t = c.currentTime + note.delay
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + note.dur)
  })
  // Add shimmer
  const osc2 = c.createOscillator()
  const gain2 = c.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(2000, c.currentTime + 0.36)
  osc2.frequency.exponentialRampToValueAtTime(3000, c.currentTime + 0.66)
  gain2.gain.setValueAtTime(0.06, c.currentTime + 0.36)
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.66)
  osc2.connect(gain2).connect(c.destination)
  osc2.start(c.currentTime + 0.36); osc2.stop(c.currentTime + 0.66)
}
