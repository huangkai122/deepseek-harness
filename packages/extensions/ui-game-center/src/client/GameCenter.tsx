/**
 * Game Center main React component.
 * Displays available games and allows launching them.
 */

import { useState, useCallback } from 'react'
import { GameCard } from './GameCard'
import { GamePlayer } from './GamePlayer'
import { BUILTIN_GAMES } from './games'
import type { GameDefinition } from './games'

/**
 * Main Game Center component.
 * Shows a grid of available games, and a player view when a game is launched.
 */
export function GameCenter() {
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleLaunch = useCallback((game: GameDefinition) => {
    setActiveGame(game)
    setIsPlaying(true)
  }, [])

  const handleBack = useCallback(() => {
    setIsPlaying(false)
    setActiveGame(null)
  }, [])

  if (isPlaying && activeGame) {
    return (
      <GamePlayer
        game={activeGame}
        onBack={handleBack}
      />
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎮 游戏中心</h2>
        <p style={styles.subtitle}>选择一款游戏开始畅玩吧！</p>
      </div>
      <div style={styles.grid}>
        {BUILTIN_GAMES.map(game => (
          <GameCard
            key={game.id}
            game={game}
            onLaunch={handleLaunch}
          />
        ))}
      </div>
      {BUILTIN_GAMES.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🎮</span>
          <p>暂无游戏</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    flex: '1',
    minHeight: '0',
    overflow: 'auto',
  },
  header: {
    textAlign: 'center',
    padding: '20px 0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: '8px 0 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: 'var(--dsw-alias-label-tertiary, #64748b)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
}
