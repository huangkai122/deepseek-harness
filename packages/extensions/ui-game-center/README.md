# @deepseek-ai/dsh-client-ui-game-center

🎮 游戏中心 DSH Client Plugin - 内置迷你游戏，可轻松扩展。

## 架构

```
ui-game-center/
├── package.json          # 包配置，声明 dsh.client.platform: "web"
├── tsdown.config.ts      # 构建配置
├── README.md             # 本文件
└── src/
    ├── index.ts          # Host 端入口（空实现）
    └── client/
        ├── index.tsx     # Client 插件入口
        ├── GameCenter.tsx # 主组件
        ├── GameCard.tsx   # 游戏卡片组件
        ├── GamePlayer.tsx # 游戏播放器组件
        ├── locales.ts    # 国际化字典
        └── games/
            ├── index.ts  # 游戏注册中心
            └── jump-jump.ts # 跳一跳游戏
```

## 添加新游戏

### 第一步：创建游戏 HTML 文件

在 `src/client/games/` 目录下创建新的游戏文件，例如 `snake.ts`：

```typescript
/**
 * 贪吃蛇游戏 HTML 内容
 */
export const GAME_ID = 'snake'
export const GAME_NAME = '贪吃蛇'
export const GAME_ICON = '🐍'

export const gameHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>贪吃蛇</title>
<style>
/* 游戏样式 */
</style>
</head>
<body>
<!-- 游戏内容 -->
<script>
// 游戏逻辑

// 重要：游戏结束时发送消息
// window.parent.postMessage({ type: 'game-over', score: 100 }, '*');

// 重要：退出时发送消息
// window.parent.postMessage({ type: 'game-exit' }, '*');

// 重要：游戏就绪时发送消息
// window.parent.postMessage({ type: 'game-ready', gameId: 'snake' }, '*');
</script>
</body>
</html>`
```

### 第二步：注册游戏

编辑 `src/client/games/index.ts`，添加新游戏：

```typescript
// 导入新游戏
export { gameHtml as snakeHtml, GAME_ID as SNAKE_ID, GAME_NAME as SNAKE_NAME, GAME_ICON as SNAKE_ICON } from './snake'

// 在 BUILTIN_GAMES 数组中添加
import { gameHtml as snakeHtml, GAME_ID as SNAKE_ID, GAME_NAME as SNAKE_NAME, GAME_ICON as SNAKE_ICON } from './snake'

export const BUILTIN_GAMES: GameDefinition[] = [
  // ... 现有游戏
  {
    id: SNAKE_ID,
    name: SNAKE_NAME,
    icon: SNAKE_ICON,
    description: '经典贪吃蛇游戏！',
    category: '休闲',
    badge: 'classic',
    tags: ['休闲', '经典'],
    html: snakeHtml,
  },
]
```

### 第三步：构建插件

```bash
cd packages/client/ui-game-center
pnpm run bundle
```

## 消息协议

游戏通过 `window.parent.postMessage` 与 DSH 通信：

| 消息类型 | 说明 | 数据 |
|---------|------|------|
| `game-ready` | 游戏加载完成 | `{ gameId: string }` |
| `game-over` | 游戏结束 | `{ score: number, best?: number }` |
| `game-exit` | 用户退出游戏 | 无 |

## 国际化

在 `src/client/locales.ts` 中添加新的翻译键：

```typescript
export const zh = {
  // ... 现有键
  'newKey': '中文翻译',
}

export const en = {
  // ... 现有键
  'newKey': 'English translation',
}
```

## 开发模式

```bash
# 监听模式构建
pnpm run watch

# 或者使用 DSH 的 dev:web 命令（从仓库根目录）
pnpm run dev:web
```

## 技术细节

- 游戏 HTML 作为字符串嵌入 TypeScript 文件
- 运行时通过 `Blob` + `URL.createObjectURL` 创建 iframe src
- 使用 `sandbox="allow-scripts"` 限制 iframe 权限
- 支持 HMR 热更新（配合 `pnpm run dev:web`）

## License

MIT
