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

export function serveFood() {
  playTone(800, 0.1, 'sine', 0.12)
}

export function punchHit() {
  playNoise(0.08, 0.12)
  playTone(150, 0.1)
}

export function bazookaFire() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(600, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.2)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.2)
  playNoise(0.1, 0.06)
}

export function bazookaExplode() {
  playNoise(0.15, 0.15)
  playTone(100, 0.2, 'square', 0.12)
}

export function monsterGrowl() {
  playTone(80, 0.2, 'sawtooth', 0.15)
}

export function wrongAction() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}

export function comboUp() {
  const c = getCtx()
  const freqs = [500, 800, 1200]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.04
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.04)
  })
}

export function customerAngry() {
  const c = getCtx()
  const freqs = [150, 100]
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

export function lifeLost() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.3)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.3)
}

/** Ascending alarm beeps - rush wave incoming */
export function rushWarning() {
  const c = getCtx()
  const freqs = [400, 600, 800, 1000]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.1)
  })
}

/** Quick sparkle sound for speed bonus */
export function speedBonus() {
  const c = getCtx()
  const freqs = [1200, 1600, 2000]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.03
    gain.gain.setValueAtTime(0.08, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.06)
  })
}

/** Magical chime for golden customer */
export function goldenCustomer() {
  const c = getCtx()
  const freqs = [800, 1000, 1200, 1500, 1800]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.06
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.15)
  })
}
