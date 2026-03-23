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

export function selectUnit() {
  playTone(800, 0.04, 'sine')
}

export function commandMove() {
  playTone(600, 0.03, 'square')
  setTimeout(() => playTone(800, 0.03, 'square'), 30)
}

export function commandAttack() {
  playTone(400, 0.06, 'sawtooth')
}

export function buildPlace() {
  playTone(300, 0.06, 'triangle')
  setTimeout(() => playTone(500, 0.06, 'triangle'), 60)
}

export function buildComplete() {
  playTone(700, 0.08, 'sine')
  setTimeout(() => playTone(900, 0.07, 'sine'), 80)
}

export function unitTrained() {
  playTone(600, 0.05, 'triangle')
}

let lastCombatTime = 0
export function combat() {
  const now = performance.now()
  if (now - lastCombatTime < 300) return
  lastCombatTime = now
  playNoise(0.05)
}

export function towerShot() {
  playTone(500, 0.04, 'square')
}

export function waveIncoming() {
  playTone(300, 0.12, 'sawtooth', 0.15)
  setTimeout(() => playTone(600, 0.12, 'sawtooth', 0.15), 150)
  setTimeout(() => playTone(300, 0.12, 'sawtooth', 0.15), 300)
}

export function crystalPickup() {
  playTone(1000, 0.03, 'sine')
  setTimeout(() => playTone(1200, 0.03, 'sine'), 30)
}
