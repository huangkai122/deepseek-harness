/**
 * Game Center footer action trigger.
 * Renders a game icon button in the sidebar foot; clicking opens the game
 * center in a wide overlay dialog portaled to the document body.
 */

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconPlayOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { GameCenter } from './GameCenter'

/** Footer action owner props: the sidebar column state. */
interface GameCenterTriggerProps {
  wide?: boolean
}

/**
 * Footer action button with a game icon, and the game center overlay dialog.
 */
export function GameCenterTrigger({ wide = true }: GameCenterTriggerProps) {
  const [open, setOpen] = useState(false)

  const handleClose = useCallback(() => { setOpen(false) }, [])

  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open])

  return (
    <>
      <button
        type="button"
        style={wide ? styles.trigger : styles.triggerRail}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="游戏中心"
        title="游戏中心"
        onClick={() => { setOpen(true) }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <IconPlayOutline16 size={17} />
        {wide && <span style={styles.label}>游戏中心</span>}
      </button>

      {open && createPortal(
        <div style={styles.overlay} role="presentation">
          <div style={styles.mask} aria-hidden="true" onClick={handleClose} />
          <div style={styles.dialog} role="dialog" aria-modal="true" aria-label="游戏中心">
            <div style={styles.header}>
              <span style={styles.title}><IconPlayOutline16 size={17} /> 游戏中心</span>
              <button
                type="button"
                style={styles.closeButton}
                aria-label="关闭"
                onClick={handleClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={styles.body}>
              <GameCenter />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  // Footer trigger button (wide sidebar row, the 42px foot-row box).
  trigger: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: 'calc(100% + 4px)',
    height: '42px',
    margin: '4px -2px',
    padding: '0 10px 0 8px',
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: '12px',
    background: 'transparent',
    cursor: 'pointer',
    overflow: 'hidden',
    color: 'var(--dsw-alias-label-primary, #f1f5f9)',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '22px',
  },
  // Footer trigger button (collapsed rail circle, the 36px foot box).
  triggerRail: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    margin: '8px 0 10px',
    padding: '0',
    boxSizing: 'border-box',
    border: 'none',
    borderRadius: '50%',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--dsw-alias-label-primary, #f1f5f9)',
  },
  icon: {
    fontSize: '16px',
    lineHeight: '1',
    display: 'inline-flex',
  },
  label: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  // Overlay dialog (portaled to body so stacking contexts cannot trap it).
  overlay: {
    position: 'fixed',
    inset: '0',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  mask: {
    position: 'absolute',
    inset: '0',
    background: 'var(--dsw-alias-bg-mask-1, rgba(0,0,0,0.24))',
    backdropFilter: 'var(--dsw-mask-blur, blur(2px))',
  },
  dialog: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: 'min(900px, 100%)',
    height: 'min(640px, 100%)',
    overflow: 'hidden',
    border: '1px solid var(--dsw-alias-border-inverted, rgba(255,255,255,0.08))',
    borderRadius: '24px',
    background: 'var(--dsw-alias-bg-layer-2, #1e293b)',
    boxShadow: 'var(--dsw-shadow-lv3, 0 20px 50px rgba(0,0,0,0.5))',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '16px 16px 10px 24px',
    flex: 'none',
  },
  title: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 500,
    color: '#f8fafc',
  },
  closeButton: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--dsw-alias-label-secondary, #94a3b8)',
  },
  body: {
    flex: '1',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 12px 12px',
    overflow: 'hidden',
  },
}
