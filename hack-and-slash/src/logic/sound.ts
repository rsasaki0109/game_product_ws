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

export function swordSwing() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(800, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.1)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.1)
}

export function swordHit() {
  playNoise(0.05, 0.12)
  playTone(200, 0.08)
}

export function enemyDeath() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.2)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.2)
  playNoise(0.15, 0.08)
}

export function playerDodge() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}

export function playerHurt() {
  playTone(100, 0.15)
  playNoise(0.15, 0.1)
}

export function lootPickup() {
  const c = getCtx()
  const freqs = [400, 600, 800]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.05
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.05)
  })
}

export function floorClear() {
  const c = getCtx()
  const freqs = [500, 700, 1000]
  freqs.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const t = c.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start(t); osc.stop(t + 0.15)
  })
}
