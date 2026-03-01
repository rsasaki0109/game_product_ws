import { useEffect, useRef, useState } from 'react'
import './App.css'

type GameMode = 'playing' | 'gameover'
type InputState = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  attack: boolean
  throw: boolean
}

type PlayerState = {
  x: number
  y: number
  hp: number
  facing: -1 | 1
  speed: number
  attackCd: number
  throwCd: number
  invuln: number
}

type EnemyState = {
  id: number
  x: number
  y: number
  hp: number
  maxHp: number
  radius: number
  speed: number
  attackCd: number
  shotCd: number
}

type BallState = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  owner: 'player' | 'enemy'
  ttl: number
}

type GameState = {
  mode: GameMode
  player: PlayerState
  enemies: EnemyState[]
  balls: BallState[]
  score: number
  elapsed: number
  spawnTimer: number
  input: InputState
  lastThrow: boolean
  lastAttack: boolean
  nextEnemyId: number
  nextBallId: number
  previousTime: number
}

type HudState = {
  mode: GameMode
  hp: number
  score: number
  enemies: number
  elapsed: number
}

const WORLD_WIDTH = 960
const WORLD_HEIGHT = 540
const WORLD_PADDING = 24
const MAX_HP = 100
const PLAYER_RADIUS = 18

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x1 - x2, y1 - y2)

const random = (min: number, max: number) => min + Math.random() * (max - min)

const newInputState = (): InputState => ({
  left: false,
  right: false,
  up: false,
  down: false,
  attack: false,
  throw: false,
})

const newGameState = (): GameState => ({
  mode: 'playing',
  player: {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT - 96,
    hp: MAX_HP,
    facing: 1,
    speed: 280,
    attackCd: 0,
    throwCd: 0,
    invuln: 0,
  },
  enemies: [],
  balls: [],
  score: 0,
  elapsed: 0,
  spawnTimer: 1.2,
  input: newInputState(),
  lastThrow: false,
  lastAttack: false,
  nextEnemyId: 1,
  nextBallId: 1,
  previousTime: 0,
})

const keyFromCode = (code: string): keyof InputState | null => {
  if (code === 'ArrowLeft' || code === 'KeyA') return 'left'
  if (code === 'ArrowRight' || code === 'KeyD') return 'right'
  if (code === 'ArrowUp' || code === 'KeyW') return 'up'
  if (code === 'ArrowDown' || code === 'KeyS') return 'down'
  if (code === 'KeyJ') return 'attack'
  if (code === 'Space') return 'throw'
  return null
}

const spawnEnemy = (state: GameState, score: number): EnemyState => {
  const edge = Math.random()
  let x: number
  let y: number

  if (edge < 0.6) {
    x = random(WORLD_PADDING, WORLD_WIDTH - WORLD_PADDING)
    y = -35
  } else if (edge < 0.8) {
    x = -35
    y = random(WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING * 2.5)
  } else {
    x = WORLD_WIDTH + 35
    y = random(WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING * 2.5)
  }

  const maxHp = Math.min(7, 2 + Math.floor(score / 4))
  return {
    id: state.nextEnemyId,
    x,
    y,
    hp: maxHp,
    maxHp,
    radius: random(16, 20),
    speed: random(90, 130) + Math.min(130, score * 3),
    attackCd: 0,
    shotCd: random(0.8, 1.6),
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(newGameState())
  const [hud, setHud] = useState<HudState>({
    mode: 'playing',
    hp: MAX_HP,
    score: 0,
    enemies: 0,
    elapsed: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = { sx: 1, sy: 1 }
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const { clientWidth, clientHeight } = canvas
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      scale.sx = canvas.width / WORLD_WIDTH
      scale.sy = canvas.height / WORLD_HEIGHT
    }

    const resetGame = () => {
      stateRef.current = newGameState()
      setHud({
        mode: 'playing',
        hp: MAX_HP,
        score: 0,
        enemies: 0,
        elapsed: 0,
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = keyFromCode(event.code)
      if (!key) return
      if (event.code === 'Space' || ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault()
      }

      if (stateRef.current.mode === 'gameover' && event.code === 'KeyR' && !event.repeat) {
        resetGame()
        return
      }

      if (event.code === 'KeyR') {
        return
      }

      stateRef.current.input[key] = true
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const key = keyFromCode(event.code)
      if (!key) return
      stateRef.current.input[key] = false
    }

    const draw = () => {
      const state = stateRef.current
      ctx.setTransform(scale.sx, 0, 0, scale.sy, 0, 0)
      ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

      const sky = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT)
      sky.addColorStop(0, '#1a3f77')
      sky.addColorStop(1, '#4a8c6f')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

      ctx.fillStyle = '#2f7d4e'
      ctx.fillRect(0, WORLD_HEIGHT - 160, WORLD_WIDTH, 160)

      const line = '#e6f1f0'
      ctx.strokeStyle = line
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(28, 24)
      ctx.lineTo(WORLD_WIDTH - 28, 24)
      ctx.lineTo(WORLD_WIDTH - 28, WORLD_HEIGHT - 24)
      ctx.lineTo(28, WORLD_HEIGHT - 24)
      ctx.closePath()
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(WORLD_WIDTH / 2 - 110, WORLD_HEIGHT - 120, 220, 95)
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.strokeRect(WORLD_WIDTH / 2 - 110, WORLD_HEIGHT - 120, 220, 95)

      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(WORLD_WIDTH / 2, WORLD_HEIGHT - 95, 46, Math.PI, Math.PI * 2)
      ctx.stroke()

      const drawPlayer = (x: number, y: number, size: number, teamColor: string, hatColor: string, facing: number, blink: boolean) => {
        ctx.fillStyle = blink ? '#ffd166' : teamColor
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#131'
        ctx.beginPath()
        ctx.arc(x + facing * (size * 0.5), y - 10, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = hatColor
        ctx.beginPath()
        ctx.moveTo(x - size * 0.6, y - 18)
        ctx.lineTo(x + size * 0.6, y - 18)
        ctx.lineTo(x + size * 0.35, y - 4)
        ctx.lineTo(x - size * 0.35, y - 4)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#7a5623'
        ctx.fillRect(x + facing * 8, y - 4, facing * size * 1.5, 4)
      }

      const drawHp = (x: number, y: number, w: number, h: number, current: number, max: number) => {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(x - w / 2, y, w, h)
        const pct = clamp(current / max, 0, 1)
        ctx.fillStyle = current > max * 0.4 ? '#4ef19a' : '#ff7f7f'
        ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * pct, h - 2)
      }

      drawPlayer(
        state.player.x,
        state.player.y,
        PLAYER_RADIUS,
        '#1f6fff',
        '#4fd6ff',
        state.player.facing,
        state.player.invuln > 0
      )
      drawHp(state.player.x, state.player.y - 38, 60, 8, state.player.hp, MAX_HP)

      for (const enemy of state.enemies) {
        drawPlayer(
          enemy.x,
          enemy.y,
          enemy.radius,
          '#d33a3a',
          '#f08a8a',
          enemy.x < state.player.x ? -1 : 1,
          false
        )
        drawHp(enemy.x, enemy.y - (enemy.radius + 14), enemy.radius * 2.2, 7, enemy.hp, enemy.maxHp)
      }

      for (const ball of state.balls) {
        ctx.fillStyle = ball.owner === 'player' ? '#ffef85' : '#d5e5ff'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let frameId = 0

    const update = (time: number) => {
      const state = stateRef.current
      const dt = state.previousTime === 0 ? 0 : clamp((time - state.previousTime) / 1000, 0.001, 0.05)
      state.previousTime = time

      if (state.mode === 'playing') {
        state.elapsed += dt

        const input = state.input
        const throwPressed = input.throw && !state.lastThrow
        const attackPressed = input.attack && !state.lastAttack
        state.lastThrow = input.throw
        state.lastAttack = input.attack

        state.player.attackCd = Math.max(0, state.player.attackCd - dt)
        state.player.throwCd = Math.max(0, state.player.throwCd - dt)
        state.player.invuln = Math.max(0, state.player.invuln - dt)

        let mx = 0
        let my = 0
        if (input.left) mx -= 1
        if (input.right) mx += 1
        if (input.up) my -= 1
        if (input.down) my += 1

        if (mx !== 0 || my !== 0) {
          const len = Math.max(1, Math.hypot(mx, my))
          state.player.x += (mx / len) * state.player.speed * dt
          state.player.y += (my / len) * state.player.speed * dt
          if (mx !== 0) state.player.facing = mx > 0 ? 1 : -1
        }

        state.player.x = clamp(state.player.x, WORLD_PADDING + PLAYER_RADIUS, WORLD_WIDTH - WORLD_PADDING - PLAYER_RADIUS)
        state.player.y = clamp(state.player.y, WORLD_PADDING + PLAYER_RADIUS, WORLD_HEIGHT - WORLD_PADDING - PLAYER_RADIUS)

        if (attackPressed && state.player.attackCd <= 0) {
          state.player.attackCd = 0.28
          for (const enemy of state.enemies) {
            if (distance(state.player.x, state.player.y, enemy.x, enemy.y) < 85) {
              enemy.hp -= 1.8
              const dirx = enemy.x - state.player.x
              const diry = enemy.y - state.player.y
              const len = Math.max(1, Math.hypot(dirx, diry))
              enemy.x += (dirx / len) * 12
              enemy.y += (diry / len) * 12
            }
          }
        }

        if (throwPressed && state.player.throwCd <= 0) {
          const aim = input.up ? -1 : 1
          state.balls.push({
            id: state.nextBallId++,
            x: state.player.x + state.player.facing * (PLAYER_RADIUS + 4),
            y: state.player.y + aim * 28,
            vx: state.player.facing * 430,
            vy: aim * 40 + (Math.random() - 0.5) * 35,
            radius: 6,
            damage: 22,
            owner: 'player',
            ttl: 2.5,
          })
          state.player.throwCd = 0.35
        }

        state.spawnTimer -= dt
        if (state.spawnTimer <= 0) {
          state.enemies.push(spawnEnemy(state, state.score))
          state.nextEnemyId += 1
          const base = clamp(1.4 - Math.min(0.8, state.score * 0.05), 0.35, 1.2)
          state.spawnTimer = base + random(0, 0.35)
        }

        for (const enemy of state.enemies) {
          const dx = state.player.x - enemy.x
          const dy = state.player.y - enemy.y
          const len = Math.max(1, Math.hypot(dx, dy))
          enemy.x += (dx / len) * enemy.speed * dt
          enemy.y += (dy / len) * enemy.speed * dt
          enemy.attackCd = Math.max(0, enemy.attackCd - dt)
          enemy.shotCd = Math.max(0, enemy.shotCd - dt)

          enemy.x = clamp(enemy.x, WORLD_PADDING + enemy.radius, WORLD_WIDTH - WORLD_PADDING - enemy.radius)
          enemy.y = clamp(enemy.y, WORLD_PADDING + enemy.radius, WORLD_HEIGHT - WORLD_PADDING - enemy.radius)

          if (
            distance(enemy.x, enemy.y, state.player.x, state.player.y) < enemy.radius + PLAYER_RADIUS + 4 &&
            enemy.attackCd <= 0
          ) {
            if (state.player.invuln <= 0) {
              state.player.hp -= 14
              state.player.invuln = 0.35
            }
            enemy.attackCd = 0.6
          }

          if (enemy.shotCd <= 0 && len > 155) {
            state.balls.push({
              id: state.nextBallId++,
              x: enemy.x,
              y: enemy.y,
              vx: (dx / len) * 280,
              vy: (dy / len) * 280,
              radius: 5,
              damage: 12,
              owner: 'enemy',
              ttl: 2.6,
            })
            enemy.shotCd = 1.2 + Math.random() * 1
          }
        }

        for (let i = state.balls.length - 1; i >= 0; i--) {
          const ball = state.balls[i]
          ball.x += ball.vx * dt
          ball.y += ball.vy * dt
          ball.ttl -= dt

          let remove = false
          if (ball.ttl <= 0 || ball.x < -80 || ball.x > WORLD_WIDTH + 80 || ball.y < -80 || ball.y > WORLD_HEIGHT + 80) {
            remove = true
          }

          if (!remove) {
            if (ball.owner === 'player') {
              for (const enemy of state.enemies) {
                if (distance(ball.x, ball.y, enemy.x, enemy.y) < ball.radius + enemy.radius) {
                  enemy.hp -= ball.damage
                  remove = true
                  break
                }
              }
            } else if (state.player.invuln <= 0 && distance(ball.x, ball.y, state.player.x, state.player.y) < ball.radius + PLAYER_RADIUS) {
              state.player.hp -= ball.damage
              state.player.invuln = 0.2
              remove = true
            }
          }

          if (remove) {
            state.balls.splice(i, 1)
          }
        }

        for (let i = state.enemies.length - 1; i >= 0; i--) {
          if (state.enemies[i].hp <= 0) {
            state.enemies.splice(i, 1)
            state.score += 1
          }
        }

        if (state.player.hp <= 0) {
          state.player.hp = 0
          state.mode = 'gameover'
          state.player.invuln = 0
          state.player.attackCd = 0
          state.player.throwCd = 0
          state.input = newInputState()
        }
      }

      setHud({
        mode: state.mode,
        hp: Math.max(0, Math.round(state.player.hp)),
        score: state.score,
        enemies: state.enemies.length,
        elapsed: Math.floor(state.elapsed),
      })

      draw()
      frameId = requestAnimationFrame(update)
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    resizeCanvas()
    frameId = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="game-wrap">
      <canvas ref={canvasRef} className="field-canvas" />
      <div className="hud-layer">
        <section className="hud-top">
          <h1 className="hud-title">野球乱闘</h1>
          <div className="hud-row">経過時間: {hud.elapsed} 秒</div>
          <div className="hud-row">得点: {hud.score}</div>
          <div className="hud-row">敵数: {hud.enemies}</div>
          <div className="hp-label">体力: {hud.hp} / {MAX_HP}</div>
          <div className="hp-gauge">
            <span style={{ width: `${(hud.hp / MAX_HP) * 100}%` }} />
          </div>
        </section>
        <section className="hud-bottom">
          <span>WASD / 矢印キー: 移動</span>
          <span>J: 乱闘</span>
          <span>SPACE: 野球ボールを投げる</span>
          <span>R: リトライ</span>
        </section>
        {hud.mode === 'gameover' && (
          <section className="game-over">
            <div className="game-over-box">
              <div className="game-over-title">試合終了</div>
              <div>最終得点: {hud.score}</div>
              <div>Rキーで再開</div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
