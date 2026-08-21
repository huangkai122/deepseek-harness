/**
 * Games index.
 * All built-in games are registered here.
 */

/** Game definition for registration. */
export interface GameDefinition {
  id: string
  name: string
  icon: string
  description: string
  category: string
  badge?: 'new' | 'hot' | 'classic'
  tags: string[]
  html: string
  /** Optional cover image (data URI). Falls back to icon + gradient. */
  cover?: string
}

/** Import jump-jump game */
import { gameHtml as jumpJumpHtml, GAME_ID as JUMP_JUMP_ID, GAME_NAME as JUMP_JUMP_NAME, GAME_ICON as JUMP_JUMP_ICON, GAME_COVER as JUMP_JUMP_COVER } from './jump-jump'

/** Import snake game */
import { gameHtml as snakeHtml, GAME_ID as SNAKE_ID, GAME_NAME as SNAKE_NAME, GAME_ICON as SNAKE_ICON, GAME_COVER as SNAKE_COVER } from './snake'

/** Import battle city game */
import { gameHtml as battleCityHtml, GAME_ID as BATTLE_CITY_ID, GAME_NAME as BATTLE_CITY_NAME, GAME_ICON as BATTLE_CITY_ICON, GAME_COVER as BATTLE_CITY_COVER } from './battle-city'

/** All built-in games. */
export const BUILTIN_GAMES: GameDefinition[] = [
  {
    id: JUMP_JUMP_ID,
    name: JUMP_JUMP_NAME,
    icon: JUMP_JUMP_ICON,
    description: '经典跳跃游戏！按住屏幕蓄力，松开跳跃到下一个平台。落在中心可获得连击加分！',
    category: '休闲',
    badge: 'hot',
    tags: ['休闲', '跳跃', '反应', '连击'],
    html: jumpJumpHtml,
    cover: JUMP_JUMP_COVER,
  },
  {
    id: SNAKE_ID,
    name: SNAKE_NAME,
    icon: SNAKE_ICON,
    description: '经典贪吃蛇游戏！包含多种食物类型、等级系统、连击奖励和详细统计数据！',
    category: '休闲',
    badge: 'new',
    tags: ['休闲', '像素', '策略', '统计', '连击'],
    html: snakeHtml,
    cover: SNAKE_COVER,
  },
  {
    id: BATTLE_CITY_ID,
    name: BATTLE_CITY_NAME,
    icon: BATTLE_CITY_ICON,
    description: '经典坦克大战！消灭敌方坦克，保卫你的基地，带音效的像素风射击游戏！',
    category: '射击',
    badge: 'new',
    tags: ['射击', '经典', '策略', '像素', '音效'],
    html: battleCityHtml,
    cover: BATTLE_CITY_COVER,
  },
  // 在这里添加更多游戏...
]
