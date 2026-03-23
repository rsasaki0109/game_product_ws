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

let lastStepHigh = false
export function runStep() {
  lastStepHigh = !lastStepHigh
  playTone(lastStepHigh ? 250 : 200, 0.02, 'square', 0.06)
}

export function boost() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(800, c.currentTime + 0.1)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.1)
}

export function throwSound() {
  playNoise(0.15, 0.08)
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(600, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.10, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}

export function jumpTakeoff() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(700, c.currentTime + 0.08)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.08)
}

export function barClear() {
  playTone(800, 0.08, 'sine', 0.12)
}

export function barFail() {
  playTone(150, 0.1, 'square', 0.10)
}

export function sabotageUse() {
  playTone(500, 0.06, 'sawtooth', 0.10)
}

export function sabotageHit() {
  playNoise(0.12, 0.08)
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.12)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.12)
}

export function eventStart() {
  const c = getCtx()
  const t = c.currentTime
  const freqs = [400, 500, 600]
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0, t + i * 0.1)
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.1)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.1); osc.stop(t + 0.3)
  }
}

export function eventWin() {
  const c = getCtx()
  const t = c.currentTime
  const freqs = [600, 800, 1000]
  for (let i = 0; i < freqs.length; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0, t + i * 0.1)
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(gain).connect(c.destination)
    osc.start(t + i * 0.1); osc.stop(t + 0.3)
  }
}

export function eventLose() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, c.currentTime)
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.15)
  gain.gain.setValueAtTime(0.12, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.connect(gain).connect(c.destination)
  osc.start(); osc.stop(c.currentTime + 0.15)
}
