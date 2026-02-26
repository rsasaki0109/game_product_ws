import type { LootOption } from '../../types/loot.ts'

interface LootCardProps {
  option: LootOption
  selected: boolean
  onClick: () => void
}

const RARITY_COLORS: Record<string, string> = {
  common: 'var(--text-secondary)',
  uncommon: 'var(--neon-green)',
  rare: 'var(--neon-blue)',
  legendary: 'var(--neon-yellow)',
}

export function LootCard({ option, selected, onClick }: LootCardProps) {
  const rarityColor = option.face ? RARITY_COLORS[option.face.rarity] : 'var(--neon-green)'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 12px',
        background: selected
          ? 'rgba(79, 195, 247, 0.15)'
          : 'var(--bg-surface)',
        border: selected
          ? '2px solid var(--neon-blue)'
          : '2px solid var(--border)',
        borderRadius: 12,
        minWidth: 120,
        flex: 1,
        transition: 'all 0.2s',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>{option.emoji}</span>
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: rarityColor,
      }}>
        {option.label}
      </span>
      <span style={{
        fontSize: 11,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        {option.description}
      </span>
      {option.face && (
        <span style={{
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          background: `${rarityColor}22`,
          color: rarityColor,
        }}>
          {option.face.rarity}
        </span>
      )}
    </button>
  )
}
