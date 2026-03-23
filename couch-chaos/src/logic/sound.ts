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
