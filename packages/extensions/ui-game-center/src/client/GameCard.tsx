/**
 * Game Card component.
 * Displays a single game with its icon, name, and description.
 */

import type { GameDefinition } from './games'

interface GameCardProps {
  game: GameDefinition
  onLaunch: (game: GameDefinition) => void
}

/**
 * Game card component for the game grid.
 */
export function GameCard({ game, onLaunch }: GameCardProps) {
  return (
    <div
      style={styles.card}
      onClick={() => onLaunch(game)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{
        ...styles.thumbnail,
        ...(game.cover ? {
          backgroundImage: `url("${game.cover}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}),
      }}>
        {game.badge && (
          <span style={{
            ...styles.badge,
            ...(game.badge === 'new' ? styles.badgeNew :
              game.badge === 'hot' ? styles.badgeHot : styles.badgeClassic),
          }}>
            {game.badge === 'new' ? '🆕 新游戏' :
              game.badge === 'hot' ? '🔥 热门' : '⭐ 经典'}
          </span>
        )}
        {!game.cover && <span style={styles.icon}>{game.icon}</span>}
      </div>
      <div style={styles.info}>
        <div style={styles.name}>{game.name}</div>
        <div style={styles.desc}>{game.description}</div>
        <div style={styles.meta}>
          <span style={styles.tag}>{game.category}</span>
          <span style={styles.play}>
            开始游戏
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--dsw-alias-fill-l2, #334155)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  thumbnail: {
    position: 'relative',
    height: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    overflow: 'hidden',
  },
  icon: {
    fontSize: '48px',
  },
  badge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  badgeNew: {
    background: '#10b981',
    color: '#fff',
  },
  badgeHot: {
    background: '#ef4444',
    color: '#fff',
  },
  badgeClassic: {
    background: '#f59e0b',
    color: '#000',
  },
  info: {
    padding: '12px 16px 16px',
  },
  name: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#f8fafc',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  desc: {
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid var(--dsw-alias-border-l2, #334155)',
  },
  tag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
  },
  play: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#818cf8',
  },
}
