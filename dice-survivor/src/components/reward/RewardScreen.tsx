import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.ts'
import { LootCard } from './LootCard.tsx'

export function RewardScreen() {
  const rewardOptions = useGameStore(s => s.rewardOptions)
  const player = useGameStore(s => s.player)
  const chooseLoot = useGameStore(s => s.chooseLoot)

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [selectingFace, setSelectingFace] = useState(false)

  const selected = rewardOptions.find(o => o.id === selectedOption)

  const handleSelect = (optionId: string) => {
    const opt = rewardOptions.find(o => o.id === optionId)
    if (!opt) return

    if (opt.type === 'face_upgrade') {
      setSelectedOption(optionId)
      setSelectingFace(true)
    } else {
      chooseLoot(optionId)
    }
  }

  const handleFaceSelect = (dieIndex: number, faceIndex: number) => {
    if (!selectedOption) return
    chooseLoot(selectedOption, dieIndex, faceIndex)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      padding: '24px 16px',
      gap: 16,
      maxWidth: 480,
      margin: '0 auto',
      animation: 'fadeInUp 0.4s ease',
    }}>
      <div style={{ fontSize: 32 }}>🎁</div>
      <h2 style={{
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--neon-yellow)',
      }}>
        報酬を選べ！
      </h2>

      {!selectingFace ? (
        <div style={{
          display: 'flex',
          gap: 8,
          width: '100%',
          justifyContent: 'center',
        }}>
          {rewardOptions.map(opt => (
            <LootCard
              key={opt.id}
              option={opt}
              selected={opt.id === selectedOption}
              onClick={() => handleSelect(opt.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}>
            入れ替える面をタップ
          </div>

          {selected?.face && (
            <div style={{
              textAlign: 'center',
              fontSize: 13,
              padding: '6px 12px',
              background: 'rgba(79, 195, 247, 0.1)',
              borderRadius: 8,
              border: '1px solid var(--neon-blue)',
            }}>
              新しい面: {selected.face.emoji} {selected.face.label}
            </div>
          )}

          {player.dice.map((die, dieIdx) => (
            <div key={die.id} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <span style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: die.color,
                  marginRight: 4,
                  verticalAlign: 'middle',
                }} />
                ダイス {dieIdx + 1}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {die.faces.map((face, faceIdx) => (
                  <button
                    key={faceIdx}
                    onClick={() => handleFaceSelect(dieIdx, faceIdx)}
                    style={{
                      flex: 1,
                      padding: '8px 2px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--neon-red)'
                      e.currentTarget.style.background = 'rgba(255, 82, 82, 0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{face.emoji}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                      {face.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => { setSelectingFace(false); setSelectedOption(null) }}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              borderRadius: 8,
              alignSelf: 'center',
            }}
          >
            ← 戻る
          </button>
        </div>
      )}
    </div>
  )
}
