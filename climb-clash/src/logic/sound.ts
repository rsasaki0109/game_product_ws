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

export function grab() {
  playTone(600, 0.03, 'square', 0.12)
}

export function moveHold() {
  playTone(400, 0.05, 'triangle', 0.08)
}

export function fragileBreak() {
  playNoise(0.1, 0.08)
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.1)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.1)
}

export function recoveryHold() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(700, c.currentTime)
  osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.08)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.08)
}

export function skillDestroy() {
  playNoise(0.12, 0.10)
  playTone(200, 0.12, 'square', 0.10)
}

export function skillFreeze() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1000, c.currentTime)
  osc.frequency.linearRampToValueAtTime(2000, c.currentTime + 0.1)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.1)
}

export function skillShake() {
  playTone(80, 0.3, 'sawtooth', 0.06)
}

export function fall() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(100, c.currentTime + 0.25)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.25)
}

export function victory() {
  const c = getCtx()
  const t = c.currentTime
  const freqs = [500, 700, 900, 1100]
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0, t + i * 0.1)
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.1); osc.stop(t + 0.4)
  }
}

export function climbProgress() {
  playTone(1000, 0.02, 'square', 0.06)
}
