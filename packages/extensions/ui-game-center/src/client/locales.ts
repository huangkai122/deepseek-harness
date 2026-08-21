/**
 * Game Center locale dictionaries.
 */

/** English dictionary (source of truth for key set). */
export const en = {
  'nav': '🎮 Game Center',
  'title': '🎮 Game Center',
  'subtitle': 'Choose a game to play!',
  'play': 'Play',
  'back': 'Back',
  'loading': 'Loading...',
  'empty': 'No games available',
  'score': 'Score',
  'best': 'Best',
  'restart': 'Play Again',
  'gameover': 'Game Over',
}

/** Simplified Chinese dictionary. */
export const zh: { [Key in keyof typeof en]: string } = {
  'nav': '🎮 游戏中心',
  'title': '🎮 游戏中心',
  'subtitle': '选择一款游戏开始畅玩吧！',
  'play': '开始游戏',
  'back': '返回',
  'loading': '加载中...',
  'empty': '暂无游戏',
  'score': '得分',
  'best': '最高分',
  'restart': '再来一次',
  'gameover': '游戏结束',
}
