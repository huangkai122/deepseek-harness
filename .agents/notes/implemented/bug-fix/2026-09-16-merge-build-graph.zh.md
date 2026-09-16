# Agent Note: 恢复合并后的构建图

Status: implemented

[English](2026-09-16-merge-build-graph.md) | 中文

## 问题

这次合并保留了 origin/master 已不再挂载的兼容包。TypeScript 已将它们从当前 Client 和 Host 聚合中排除，但 tsdown workspace 仍会发现这些包的配置。相同的合并还使与编译器无关的 Typert 协议包和 brand 包没有确定的主入口构建，因此陈旧且被忽略的 lib 文件可能会以过时的导出满足解析。

## 决策

根 tsdown workspace 保留现有的空根入口，并在 tsconfig.host.json 和 tsconfig.client.json 已体现的按构建面兼容包排除项之外继续应用 tsdown 默认排除项。Typert 协议包和 brand 包各自拥有从 `lib/types/index.js` 到 `lib/index.js` 的包级 tsdown 入口，因此发布运行时入口会根据当前 TypeScript 输出重新构建。被排除的包仍可安装，源文件保持不变。

## 考虑过的替代方案

**构建保留下来的兼容包。** 不采用，因为它们已从当前产品构建图移除，API 也不再匹配当前 Host 和 Client 契约；编译它们会把构建图选择缺陷变成无关的迁移工作。

**全局恢复上游的 `lib/types/{index,invariant,startup}.js` 根入口。** 不采用，因为这个合并后的 checkout 还会把私有根包解析为 workspace 配置，而根目录没有 `lib/types` 树，导致包构建之前就失败。

**继续使用陈旧运行时产物或添加宽泛的解析回退。** 不采用，因为被忽略的构建输出不是事实来源；确定的包级入口能保留当前导出，并避免隐藏陈旧产物。

## 后果

根 Host 和 Client 构建现在使用与各自 TypeScript 聚合相同的包集合，可独立安装的旧兼容包不会进入产品 bundle。干净构建会先重新生成协议包和 brand 包的运行时入口，再供消费者使用。如果重新挂载兼容包，它们仍需要单独的后续迁移。
