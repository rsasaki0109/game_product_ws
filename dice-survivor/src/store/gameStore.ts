import { create } from 'zustand'
import type { RunState, GamePhase, TurnState } from '../types/game.ts'
import type { PlayerState } from '../types/player.ts'
import type { Die } from '../types/dice.ts'
import { createStarterDice } from '../data/starter.ts'
import { rollDice as rollDiceLogic } from '../logic/dice.ts'
import { detectCombos } from '../logic/combo.ts'
import { resolvePlayerTurn, executeEnemyTurn } from '../logic/combat.ts'
import { generateEnemy } from '../logic/dungeon.ts'
import { generateLootOptions } from '../logic/loot.ts'
import { FACES } from '../data/faces.ts'

const MAX_FLOOR = 15

const emptyTurn: TurnState = {
  rollResults: [],
  combos: [],
  totalDamage: 0,
  totalShield: 0,
  totalHeal: 0,
  log: [],
}

function createInitialPlayer(): PlayerState {
  return {
    maxHp: 50,
    currentHp: 50,
    shield: 0,
    dice: createStarterDice(),
    statusEffects: [],
  }
}

function createInitialState(): RunState {
  return {
    phase: 'title',
    floor: 1,
    maxFloor: MAX_FLOOR,
    player: createInitialPlayer(),
    enemy: null,
    turn: emptyTurn,
    rewardOptions: [],
    runStats: {
      enemiesDefeated: 0,
      totalDamageDealt: 0,
      floorsCleared: 0,
      turnsPlayed: 0,
    },
  }
}

interface GameActions {
  startRun: () => void
  startBattle: () => void
  rollDice: () => void
  resolveRoll: () => void
  doEnemyTurn: () => void
  chooseLoot: (optionId: string, dieIndex?: number, faceIndex?: number) => void
  returnToTitle: () => void
  setPhase: (phase: GamePhase) => void
}

export type GameStore = RunState & GameActions

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setPhase: (phase) => set({ phase }),

  startRun: () => {
    const player = createInitialPlayer()
    set({
      ...createInitialState(),
      player,
      phase: 'battle_start',
      floor: 1,
    })
  },

  startBattle: () => {
    const { floor } = get()
    const enemy = generateEnemy(floor)
    set({
      enemy,
      turn: emptyTurn,
      phase: 'battle_player_turn',
    })
  },

  rollDice: () => {
    const { player } = get()
    const results = rollDiceLogic(player.dice)
    const combos = detectCombos(results)

    set({
      phase: 'battle_rolling',
      turn: { ...emptyTurn, rollResults: results, combos },
    })
  },

  resolveRoll: () => {
    const { player, enemy, turn } = get()
    if (!enemy) return

    const result = resolvePlayerTurn(turn.rollResults, turn.combos, player, enemy)

    set({
      player: result.player,
      enemy: result.enemy,
      turn: result.turn,
      phase: 'battle_resolving',
      runStats: {
        ...get().runStats,
        totalDamageDealt: get().runStats.totalDamageDealt + result.turn.totalDamage,
        turnsPlayed: get().runStats.turnsPlayed + 1,
      },
    })
  },

  doEnemyTurn: () => {
    const { player, enemy, floor, turn } = get()
    if (!enemy) return

    // Check if enemy is dead
    if (enemy.currentHp <= 0) {
      const stats = get().runStats
      if (floor >= MAX_FLOOR) {
        set({
          phase: 'victory',
          runStats: { ...stats, enemiesDefeated: stats.enemiesDefeated + 1, floorsCleared: floor },
        })
      } else {
        set({
          phase: 'reward',
          rewardOptions: generateLootOptions(floor),
          runStats: { ...stats, enemiesDefeated: stats.enemiesDefeated + 1, floorsCleared: floor },
        })
      }
      return
    }

    // Enemy acts
    const result = executeEnemyTurn(player, enemy)

    // Handle Death Knight curse special
    if (enemy.def.id === 'death_knight' && enemy.currentIntent.type === 'special') {
      const cursedPlayer = { ...result.player }
      const dieIdx = Math.floor(Math.random() * 3)
      const faceIdx = Math.floor(Math.random() * 6)
      const newDice = [...cursedPlayer.dice] as [Die, Die, Die]
      const newDie = { ...newDice[dieIdx], faces: [...newDice[dieIdx].faces] as Die['faces'] }
      newDie.faces[faceIdx] = FACES['blank']
      newDice[dieIdx] = newDie
      cursedPlayer.dice = newDice
      result.player = cursedPlayer
    }

    const allLog = [...turn.log, ...result.log]

    // Check player death
    if (result.player.currentHp <= 0) {
      set({
        player: result.player,
        enemy: result.enemy,
        turn: { ...turn, log: allLog },
        phase: 'game_over',
      })
      return
    }

    set({
      player: result.player,
      enemy: result.enemy,
      turn: { ...turn, log: allLog },
      phase: 'battle_enemy_turn',
    })
  },

  chooseLoot: (optionId, dieIndex, faceIndex) => {
    const { player, rewardOptions, floor } = get()
    const option = rewardOptions.find(o => o.id === optionId)
    if (!option) return

    const newPlayer = { ...player }

    switch (option.type) {
      case 'face_upgrade': {
        if (option.face && dieIndex !== undefined && faceIndex !== undefined) {
          const newDice = [...newPlayer.dice] as [Die, Die, Die]
          const newDie = { ...newDice[dieIndex], faces: [...newDice[dieIndex].faces] as Die['faces'] }
          newDie.faces[faceIndex] = option.face
          newDice[dieIndex] = newDie
          newPlayer.dice = newDice
        }
        break
      }
      case 'heal': {
        const heal = option.healAmount ?? 10
        newPlayer.currentHp = Math.min(newPlayer.maxHp, newPlayer.currentHp + heal)
        break
      }
      case 'max_hp_up': {
        const inc = option.hpIncrease ?? 5
        newPlayer.maxHp += inc
        newPlayer.currentHp += inc
        break
      }
    }

    set({
      player: newPlayer,
      floor: floor + 1,
      phase: 'battle_start',
    })
  },

  returnToTitle: () => {
    set(createInitialState())
  },
}))
