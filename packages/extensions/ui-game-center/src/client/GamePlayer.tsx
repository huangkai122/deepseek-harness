/**
 * Game Player component.
 * Loads and runs a game in an iframe using blob URLs.
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import type { GameDefinition } from './games'

interface GamePlayerProps {
  game: GameDefinition
  onBack: () => void
}

/**
 * Game player component that loads embedded games via blob URLs.
 */
export function GamePlayer({ game, onBack }: GamePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create blob URL from game HTML
  const gameUrl = useMemo(() => {
    const blob = new Blob([game.html], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }, [game.html])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(gameUrl)
    }
  }, [gameUrl])

  // Handle messages from the game iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      switch (data.type) {
        case 'game-ready':
          setIsLoading(false)
          break
        case 'game-exit':
          onBack()
          break
        case 'game-over':
          console.log('Game over:', data)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onBack])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={onBack}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--dsw-alias-fill-l2, #334155)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
        <span style={styles.gameName}>{game.icon} {game.name}</span>
        <div style={styles.spacer} />
      </div>
      <div style={styles.playerContainer}>
        {isLoading && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <span>加载中...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={gameUrl}
          style={{
            ...styles.iframe,
            opacity: isLoading ? 0 : 1,
          }}
          sandbox="allow-scripts allow-same-origin"
          title={game.name}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--dsw-alias-fill-l1, #1e293b)',
    borderBottom: '1px solid var(--dsw-alias-border-l2, #334155)',
    gap: '12px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--dsw-alias-label-primary, #f1f5f9)',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '13px',
    transition: 'background 0.15s',
  },
  gameName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--dsw-alias-label-primary, #f1f5f9)',
  },
  spacer: {
    flex: 1,
  },
  playerContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    transition: 'opacity 0.3s',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'var(--dsw-alias-label-secondary, #94a3b8)',
    zIndex: 10,
    background: '#1a1a2e',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--dsw-alias-fill-l2, #334155)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}
