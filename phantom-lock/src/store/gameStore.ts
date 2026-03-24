import { create } from 'zustand'
import type { GamePhase, Difficulty, Vec3, EnemyInstance, ProjectileInstance, QuickShotInstance, PlayerState, LockOnState } from '../types/game.ts'
import { getEnemyDef } from '../data/enemies.ts'
import { getWaveDef, MAX_WAVE } from '../data/waves.ts'
import { getNextUid, resetUids } from '../logic/ids.ts'
import { checkCollision, comboMultiplier, clampArena, normalize3, scale3, add3 } from '../logic/combat.ts'
import { tryLockEnemies } from '../logic/lockOn.ts'
import { spawnHomingProjectile, spawnQuickShot, steerProjectile } from '../logic/projectile.ts'
import { tickEnemy } from '../logic/enemyAI.ts'
import * as sfx from '../logic/sound.ts'

const WAVE_PAUSE = 2
const ENERGY_REGEN = 16
const HP_REGEN_RATE = 16
const HP_REGEN_DELAY = 1.5
const DASH_SPEED = 30
const DASH_DURATION = 0.2
const DASH_COOLDOWN = 1.0
const PLAYER_SPEED = 10
const QUICK_SHOT_CD = 0.1
const BASE_MISSILE_DMG = 24
const CHAIN_KILL_WINDOW = 2.0 // seconds for chain kill
const CHAIN_KILL_MIN = 3 // minimum kills for chain bonus
const MULTI_LOCK_THRESHOLD = 4 // minimum locks for QUAD LOCK bonus

const LS_HIGH_SCORE_KEY = 'phantom-lock-highscore'
const LS_TUTORIAL_KEY = 'phantom-lock-tutorial-done'

function loadHighScore(): number {
  try {
    const v = localStorage.getItem(LS_HIGH_SCORE_KEY)
    return v ? parseInt(v, 10) || 0 : 0
  } catch { return 0 }
}

function saveHighScore(score: number) {
  try { localStorage.setItem(LS_HIGH_SCORE_KEY, String(score)) } catch {}
}

function loadTutorialDone(): boolean {
  try { return localStorage.getItem(LS_TUTORIAL_KEY) === '1' } catch { return false }
}

function saveTutorialDone() {
  try { localStorage.setItem(LS_TUTORIAL_KEY, '1') } catch {}
}

interface WaveScoreSummary {
  wave: number
  kills: number
  bestBurst: number
  waveScore: number
  timer: number
}

interface GameStore {
  phase: GamePhase
  player: PlayerState
  enemies: EnemyInstance[]
  projectiles: ProjectileInstance[]
  quickShots: QuickShotInstance[]
  lockOn: LockOnState
  currentWave: number
  waveTimer: number
  score: number
  combo: number
  comboTimer: number
  elapsed: number
  cameraYaw: number
  crosshairWorldPos: Vec3
  rightMouseDown: boolean
  highScore: number
  showTutorial: boolean
  tutorialStep: number
  paused: boolean
  bestCombo: number
  totalMissilesFired: number
  totalEnemiesKilled: number
  timeSurvived: number
  difficulty: Difficulty
  gameOverTransition: number
  // New: chain kill tracking
  chainKillTimer: number
  chainKillCount: number
  chainKillActive: boolean
  // New: multi-lock bonus
  lastBurstSize: number
  multiLockBonusTimer: number
  multiLockBonusText: string
  // New: wave score summary
  waveSummary: WaveScoreSummary | null
  waveKills: number
  waveBestBurst: number
  waveScore: number

  startGame: () => void
  returnToTitle: () => void
  setDifficulty: (d: Difficulty) => void
  tick: (delta: number, keys: Record<string, boolean>) => void
  setCameraYaw: (yaw: number) => void
  setCrosshairWorldPos: (pos: Vec3) => void
  setRightMouse: (down: boolean) => void
  fireQuickShot: (aimDir: Vec3) => void
  fireLockBurst: () => void
  triggerDash: (moveDir: Vec3) => void
  togglePause: () => void
  advanceTutorial: () => void
  showTutorialAgain: () => void
}

function makePlayer(): PlayerState {
  return {
    position: [0, 1, 0],
    hp: 200, maxHp: 200,
    energy: 150, maxEnergy: 150,
    dashCooldown: 0, dashTimer: 0,
    regenTimer: 0, quickShotCooldown: 0,
  }
}

function spawnWave(wave: number, difficulty: Difficulty = 'normal'): EnemyInstance[] {
  const def = getWaveDef(wave)
  const enemies: EnemyInstance[] = []
  const diffMult = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.3 : 1.0
  const scale = (1 + (wave - 1) * 0.08) * diffMult

  for (const spawn of def.spawns) {
    const eDef = getEnemyDef(spawn.type)
    for (let i = 0; i < spawn.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 16 + Math.random() * 4
      const y = spawn.type === 'drone' ? 1.5 : spawn.type === 'turret' ? 0.5 : 1.0
      enemies.push({
        uid: getNextUid(),
        def: eDef,
        position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        currentHp: Math.round(eDef.hp * scale),
        maxHp: Math.round(eDef.hp * scale),
        attackTimer: eDef.attackCooldown * (0.5 + Math.random()),
        orbitAngle: angle,
        alive: true,
      })
    }
  }
  return enemies
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'title',
  player: makePlayer(),
  enemies: [],
  projectiles: [],
  quickShots: [],
  lockOn: { active: false, lockedUids: [] },
  currentWave: 0,
  waveTimer: 3,
  score: 0,
  combo: 0,
  comboTimer: 0,
  elapsed: 0,
  cameraYaw: 0,
  crosshairWorldPos: [0, 1, -10],
  rightMouseDown: false,
  highScore: loadHighScore(),
  showTutorial: !loadTutorialDone(),
  tutorialStep: 0,
  paused: false,
  bestCombo: 0,
  totalMissilesFired: 0,
  totalEnemiesKilled: 0,
  timeSurvived: 0,
  difficulty: 'normal' as Difficulty,
  gameOverTransition: 0,
  chainKillTimer: 0,
  chainKillCount: 0,
  chainKillActive: false,
  lastBurstSize: 0,
  multiLockBonusTimer: 0,
  multiLockBonusText: '',
  waveSummary: null,
  waveKills: 0,
  waveBestBurst: 0,
  waveScore: 0,

  setDifficulty: (d: Difficulty) => set({ difficulty: d }),

  startGame: () => {
    resetUids()
    const s = get()
    set({
      phase: 'wave_pause',
      player: makePlayer(),
      enemies: [],
      projectiles: [],
      quickShots: [],
      lockOn: { active: false, lockedUids: [] },
      currentWave: 0,
      waveTimer: 3,
      score: 0,
      combo: 0,
      comboTimer: 0,
      elapsed: 0,
      paused: false,
      bestCombo: 0,
      totalMissilesFired: 0,
      totalEnemiesKilled: 0,
      timeSurvived: 0,
      gameOverTransition: 0,
      showTutorial: s.showTutorial,
      tutorialStep: s.showTutorial ? 0 : -1,
      chainKillTimer: 0,
      chainKillCount: 0,
      chainKillActive: false,
      lastBurstSize: 0,
      multiLockBonusTimer: 0,
      multiLockBonusText: '',
      waveSummary: null,
      waveKills: 0,
      waveBestBurst: 0,
      waveScore: 0,
    })
  },

  returnToTitle: () => set({ phase: 'title', paused: false }),

  togglePause: () => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'wave_pause') return
    if (s.showTutorial && s.tutorialStep >= 0) return
    set({ paused: !s.paused })
  },

  advanceTutorial: () => {
    const s = get()
    const maxStep = 4 // 0-4 = 5 steps
    if (s.tutorialStep < maxStep) {
      set({ tutorialStep: s.tutorialStep + 1 })
    } else {
      set({ showTutorial: false, tutorialStep: -1 })
      saveTutorialDone()
    }
  },

  showTutorialAgain: () => {
    set({ showTutorial: true, tutorialStep: 0 })
  },

  setCameraYaw: (yaw) => set({ cameraYaw: yaw }),
  setCrosshairWorldPos: (pos) => set({ crosshairWorldPos: pos }),
  setRightMouse: (down) => {
    const s = get()
    if (s.paused) return
    if (down) {
      set({ rightMouseDown: true, lockOn: { active: true, lockedUids: [] } })
    } else {
      set({ rightMouseDown: false })
      if (s.lockOn.lockedUids.length > 0) {
        s.fireLockBurst()
      }
      set({ lockOn: { active: false, lockedUids: [] } })
    }
  },

  fireQuickShot: (aimDir) => {
    const s = get()
    if (s.player.quickShotCooldown > 0 || s.paused) return
    sfx.quickShot()
    const shot = spawnQuickShot(s.player.position, aimDir, 20, false)
    set({
      quickShots: [...s.quickShots, shot],
      player: { ...s.player, quickShotCooldown: QUICK_SHOT_CD },
    })
  },

  fireLockBurst: () => {
    const s = get()
    sfx.lockBurst()
    const locks = s.lockOn.lockedUids
    if (locks.length === 0) return
    const mult = comboMultiplier(locks.length)
    const damage = Math.round(BASE_MISSILE_DMG * mult)
    const newProjs = locks.map(uid => {
      const enemy = s.enemies.find(e => e.uid === uid)
      const targetPos = enemy ? enemy.position : [0, 1, 0] as Vec3
      return spawnHomingProjectile(s.player.position, uid, targetPos, damage)
    })
    const newBestCombo = Math.max(s.bestCombo, locks.length)

    // Multi-lock bonus
    let multiLockBonusTimer = s.multiLockBonusTimer
    let multiLockBonusText = s.multiLockBonusText
    if (locks.length >= MULTI_LOCK_THRESHOLD) {
      sfx.multiLockAchieve(locks.length)
      const lockLabel = locks.length >= 8 ? 'MAX LOCK!' : locks.length >= 6 ? 'HEXA LOCK!' : 'QUAD LOCK!'
      multiLockBonusTimer = 2.0
      multiLockBonusText = lockLabel
    }

    set({
      projectiles: [...s.projectiles, ...newProjs],
      combo: locks.length,
      comboTimer: 2.0,
      totalMissilesFired: s.totalMissilesFired + locks.length,
      bestCombo: newBestCombo,
      lastBurstSize: locks.length,
      waveBestBurst: Math.max(s.waveBestBurst, locks.length),
      multiLockBonusTimer,
      multiLockBonusText,
    })
  },

  triggerDash: (moveDir) => {
    const s = get()
    if (s.player.dashCooldown > 0 || s.paused) return
    sfx.dashSound()
    const dir = moveDir[0] === 0 && moveDir[2] === 0
      ? [Math.sin(s.cameraYaw), 0, Math.cos(s.cameraYaw)] as Vec3
      : normalize3(moveDir)
    const dashDist = DASH_SPEED * DASH_DURATION
    const p = s.player
    set({
      player: {
        ...p,
        position: [
          clampArena(p.position[0] + dir[0] * dashDist),
          p.position[1],
          clampArena(p.position[2] + dir[2] * dashDist),
        ],
        dashTimer: DASH_DURATION,
        dashCooldown: DASH_COOLDOWN,
      },
    })
  },

  tick: (delta, keys) => {
    const s = get()
    if (s.phase === 'title') return
    if (s.paused) return
    if (s.phase === 'game_over_transition') {
      const t = s.gameOverTransition - delta
      if (t <= 0) set({ phase: 'game_over', gameOverTransition: 0 })
      else set({ gameOverTransition: t })
      return
    }
    if (s.showTutorial && s.tutorialStep >= 0 && (s.phase === 'playing' || s.phase === 'wave_pause')) return

    const elapsed = s.elapsed + delta
    const timeSurvived = s.timeSurvived + delta
    let { waveTimer, currentWave, score, combo, comboTimer } = s
    let phase = s.phase
    let totalEnemiesKilled = s.totalEnemiesKilled
    let chainKillTimer = Math.max(0, s.chainKillTimer - delta)
    let chainKillCount = s.chainKillCount
    let chainKillActive = s.chainKillActive
    let multiLockBonusTimer = Math.max(0, s.multiLockBonusTimer - delta)
    let waveKills = s.waveKills
    let waveBestBurst = s.waveBestBurst
    let waveScore = s.waveScore

    // Reset chain if timer expired
    if (chainKillTimer <= 0) {
      chainKillCount = 0
      chainKillActive = false
    }

    // Wave pause (includes summary display)
    if (phase === 'wave_pause') {
      waveTimer -= delta
      // Decay wave summary timer
      let waveSummary = s.waveSummary
      if (waveSummary) {
        waveSummary = { ...waveSummary, timer: waveSummary.timer - delta }
        if (waveSummary.timer <= 0) waveSummary = null
      }
      if (waveTimer <= 0) {
        currentWave++
        sfx.waveStart()
        const newEnemies = spawnWave(currentWave, s.difficulty)
        set({
          phase: 'playing',
          currentWave,
          enemies: [...s.enemies, ...newEnemies],
          waveTimer: 0,
          elapsed,
          timeSurvived,
          waveSummary: null,
          waveKills: 0,
          waveBestBurst: 0,
          waveScore: 0,
        })
        return
      }
      set({ waveTimer, elapsed, timeSurvived, waveSummary })
      return
    }

    if (phase !== 'playing') return

    // --- Player movement ---
    const p = { ...s.player }
    p.quickShotCooldown = Math.max(0, p.quickShotCooldown - delta)
    p.dashCooldown = Math.max(0, p.dashCooldown - delta)
    p.dashTimer = Math.max(0, p.dashTimer - delta)

    if (p.dashTimer <= 0) {
      let mx = 0, mz = 0
      if (keys['KeyW'] || keys['ArrowUp']) mz -= 1
      if (keys['KeyS'] || keys['ArrowDown']) mz += 1
      if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1
      if (keys['KeyD'] || keys['ArrowRight']) mx += 1

      if (mx !== 0 || mz !== 0) {
        const yaw = s.cameraYaw
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
        const worldX = mx * cosY + mz * sinY
        const worldZ = -mx * sinY + mz * cosY
        const len = Math.sqrt(worldX * worldX + worldZ * worldZ)
        const spd = PLAYER_SPEED * delta
        p.position = [
          clampArena(p.position[0] + (worldX / len) * spd),
          p.position[1],
          clampArena(p.position[2] + (worldZ / len) * spd),
        ]
      }
    }

    // HP regen
    p.regenTimer += delta
    if (p.regenTimer >= HP_REGEN_DELAY && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + HP_REGEN_RATE * delta)
    }

    // Energy regen
    if (!s.lockOn.active) {
      p.energy = Math.min(p.maxEnergy, p.energy + ENERGY_REGEN * delta)
    }

    // --- Lock-on sweep ---
    let lockOn = { ...s.lockOn }
    if (lockOn.active) {
      const cameraOffset: Vec3 = [
        p.position[0] - Math.sin(s.cameraYaw) * 12,
        p.position[1] + 8,
        p.position[2] - Math.cos(s.cameraYaw) * 12,
      ]
      const result = tryLockEnemies(
        s.enemies, lockOn.lockedUids, s.crosshairWorldPos, cameraOffset, p.energy
      )
      if (result.energyUsed > 0) {
        if (result.newLocks.length > lockOn.lockedUids.length) sfx.lockOn(result.newLocks.length)
        lockOn.lockedUids = result.newLocks
        p.energy -= result.energyUsed
      }
    }

    // --- Enemy AI ---
    const updatedEnemies: EnemyInstance[] = []
    let newEnemyShots: QuickShotInstance[] = []
    for (const enemy of s.enemies) {
      if (!enemy.alive) continue
      const result = tickEnemy(enemy, p.position, delta, elapsed)
      updatedEnemies.push(result.enemy)
      newEnemyShots = newEnemyShots.concat(result.shots)
    }

    // --- Homing projectiles ---
    let projectiles = s.projectiles.filter(pr => pr.alive && pr.age < 5)
    projectiles = projectiles.map(proj => {
      const target = updatedEnemies.find(e => e.uid === proj.targetUid && e.alive)
      const targetPos = target ? target.position : proj.lastKnownTargetPos
      let updated = steerProjectile(proj, targetPos, delta)

      // Hit check
      const hitEnemy = updatedEnemies.find(e =>
        e.alive && checkCollision(updated.position, e.position, 0.3, e.def.scale * 0.5)
      )
      if (hitEnemy) {
        sfx.missileHit()
        hitEnemy.currentHp = Math.max(0, hitEnemy.currentHp - updated.damage)
        if (hitEnemy.currentHp <= 0) {
          hitEnemy.alive = false
          sfx.enemyDeath()
          // Multi-lock burst bonus: 2x score if burst was 4+
          const burstBonus = s.lastBurstSize >= MULTI_LOCK_THRESHOLD ? 2 : 1
          const killScore = Math.round(hitEnemy.def.score * comboMultiplier(combo || 1) * burstBonus)
          score += killScore
          waveScore += killScore
          totalEnemiesKilled++
          waveKills++
          // Chain kill tracking
          chainKillCount++
          chainKillTimer = CHAIN_KILL_WINDOW
          if (chainKillCount >= CHAIN_KILL_MIN && !chainKillActive) {
            chainKillActive = true
            sfx.chainKill()
            // Chain kill bonus: +50% of accumulated score for these kills
            const chainBonus = Math.round(killScore * 0.5)
            score += chainBonus
            waveScore += chainBonus
          }
        }
        updated = { ...updated, alive: false }
      }

      // Out of bounds
      if (Math.abs(updated.position[0]) > 25 || Math.abs(updated.position[2]) > 25 || updated.position[1] < -2) {
        updated = { ...updated, alive: false }
      }

      return updated
    })

    // --- Quick shots (player) ---
    let quickShots = [...s.quickShots, ...newEnemyShots].filter(qs => qs.alive && qs.ttl > 0)
    quickShots = quickShots.map(qs => {
      const newPos = add3(qs.position, scale3(qs.velocity, delta))
      let updated = { ...qs, position: newPos, ttl: qs.ttl - delta }

      if (!qs.isEnemy) {
        // Player shot -> hit enemies
        const hit = updatedEnemies.find(e =>
          e.alive && checkCollision(newPos, e.position, 0.2, e.def.scale * 0.5)
        )
        if (hit) {
          hit.currentHp = Math.max(0, hit.currentHp - qs.damage)
          if (hit.currentHp <= 0) {
            hit.alive = false
            sfx.enemyDeath()
            const killScore = hit.def.score
            score += killScore
            waveScore += killScore
            totalEnemiesKilled++
            waveKills++
            chainKillCount++
            chainKillTimer = CHAIN_KILL_WINDOW
            if (chainKillCount >= CHAIN_KILL_MIN && !chainKillActive) {
              chainKillActive = true
              sfx.chainKill()
              score += Math.round(killScore * 0.5)
              waveScore += Math.round(killScore * 0.5)
            }
          }
          updated = { ...updated, alive: false }
        }
      } else {
        // Enemy shot -> hit player
        if (p.dashTimer <= 0 && checkCollision(newPos, p.position, 0.2, 0.5)) {
          p.hp = Math.max(0, p.hp - qs.damage)
          p.regenTimer = 0
          sfx.playerHurt()
          updated = { ...updated, alive: false }
        }
      }

      // Out of bounds
      if (Math.abs(newPos[0]) > 25 || Math.abs(newPos[2]) > 25) {
        updated = { ...updated, alive: false }
      }

      return updated
    })

    // Combo timer
    comboTimer = Math.max(0, comboTimer - delta)
    if (comboTimer <= 0) combo = 0

    // Filter dead
    const aliveEnemies = updatedEnemies.filter(e => e.alive)
    const aliveProjectiles = projectiles.filter(pr => pr.alive)
    const aliveShots = quickShots.filter(qs => qs.alive && qs.ttl > 0)

    // Remove locks for dead enemies
    lockOn.lockedUids = lockOn.lockedUids.filter(uid => aliveEnemies.some(e => e.uid === uid))

    // Wave completion
    let waveSummary = s.waveSummary
    if (aliveEnemies.length === 0 && currentWave > 0) {
      if (currentWave >= MAX_WAVE) {
        phase = 'victory'
        const newHigh = Math.max(s.highScore, score)
        if (newHigh > s.highScore) saveHighScore(newHigh)
        sfx.waveClear()
        set({
          phase, player: p, enemies: aliveEnemies, projectiles: aliveProjectiles,
          quickShots: aliveShots, lockOn, currentWave, waveTimer, score, combo,
          comboTimer, elapsed, timeSurvived, totalEnemiesKilled, highScore: newHigh,
          chainKillTimer, chainKillCount, chainKillActive, multiLockBonusTimer,
          waveKills, waveBestBurst, waveScore,
        })
        return
      } else {
        phase = 'wave_pause'
        waveTimer = WAVE_PAUSE
        sfx.waveClear()
        // Create wave summary
        waveSummary = {
          wave: currentWave,
          kills: waveKills,
          bestBurst: waveBestBurst,
          waveScore: waveScore,
          timer: WAVE_PAUSE,
        }
      }
    }

    // Death check
    if (p.hp <= 0) {
      const newHigh = Math.max(s.highScore, score)
      if (newHigh > s.highScore) saveHighScore(newHigh)
      set({
        phase: 'game_over_transition', gameOverTransition: 1.0, player: p, enemies: aliveEnemies, projectiles: aliveProjectiles,
        quickShots: aliveShots, lockOn, currentWave, waveTimer, score, combo,
        comboTimer, elapsed, timeSurvived, totalEnemiesKilled, highScore: newHigh,
        chainKillTimer, chainKillCount, chainKillActive, multiLockBonusTimer,
        waveKills, waveBestBurst, waveScore,
      })
      return
    }

    set({
      phase,
      player: p,
      enemies: aliveEnemies,
      projectiles: aliveProjectiles,
      quickShots: aliveShots,
      lockOn,
      currentWave,
      waveTimer,
      score,
      combo,
      comboTimer,
      elapsed,
      timeSurvived,
      totalEnemiesKilled,
      chainKillTimer,
      chainKillCount,
      chainKillActive,
      multiLockBonusTimer,
      multiLockBonusText: s.multiLockBonusText,
      waveSummary,
      waveKills,
      waveBestBurst,
      waveScore,
    })
  },
}))
