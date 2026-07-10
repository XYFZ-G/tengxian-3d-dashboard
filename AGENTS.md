# 项目：藤县 3D 可视化大屏

本项目用于实现藤县 3D 地图可视化大屏。核心目标是先完成可交互的 3D 地图主体，再根据 Figma 设计图、切图、尺寸和样式继续实现图表面板、数据面板与实时数据模块。

## 技术栈

- Vue 3（Composition API + `<script setup>`）
- Three.js（3D 地图、粒子、飞线、下钻交互）
- ECharts（2D 图表面板，版本以 `package.json` 为准）
- WebSocket（实时数据）
- Pinia（状态管理）
- Vite（构建）
- SCSS（样式）

## 目录约定

- GeoJSON 数据：`src/assets/map/`
  - 支持多级结构，例如 `tengxian.json`、`tengxian/xxx-town.json`
- Figma 切图：`figma/exports/`
  - 由 MCP 或 Figma 导出流程生成，禁止手动修改
- Figma 截图：`figma/screenshots/`
  - 由 MCP 或 Figma 截图流程生成，禁止手动修改
- 设计规格：`figma/design-spec.md`
  - 由 MCP 或设计还原流程生成，禁止手动修改
- 3D 视觉参考：`.agents/skills/3d-map-builder/references/`
  - 存放参考截图、链接、动效说明和视觉样例
- Skills 定义：`.agents/skills/`
- 3D 组件：`src/components/ThreeScene/`
- 图表面板：`src/components/Charts/`
- 数据面板：`src/components/Panels/`
- 通用组件：`src/components/common/`
- 组合式函数：`src/composables/`
- 服务封装：`src/services/`
- 状态管理：`src/stores/`

## 实现约束

- 所有 Vue 组件必须使用 `<script setup>` 语法。
- 3D 相关逻辑优先封装在 `src/composables/` 中，组件只负责组织 DOM、生命周期和参数传递。
- WebSocket 地址必须从 `.env` 读取，禁止在源码中硬编码。
- 不要修改 `figma/` 目录下的任何文件，除非用户明确要求生成或更新 Figma 导出物。
- 3D 地图必须支持视觉参考还原和区域下钻交互。
- Figma 素材必须像素级提取与还原，禁止用 AI 生成素材替代原设计，禁止重新设计已给定的 Figma 模块。
- 提交信息使用 Conventional Commits 格式。

## 设计还原规则

- Figma 已提供的尺寸、颜色、间距、字体和切图优先级高于主观判断。
- 不要根据截图臆造缺失内容；遇到设计缺失、素材缺失或尺寸不明确时，先在代码中保留清晰的可替换结构，并向用户说明缺口。
- 切图资产应从 `figma/exports/` 读取，不要复制到其他目录后再使用，除非用户明确要求整理资产。
- 图表、面板和装饰元素应保持大屏风格统一，但不得偏离 Figma 原稿。

## 代码组织偏好

- Three.js 初始化、相机、渲染器、控制器、光照、地图材质和交互拾取应拆分为可维护的 composable 或工具函数。
- ECharts 面板应封装为可复用 Vue 组件，图表配置和数据映射尽量分离。
- WebSocket 连接、重连、心跳和消息分发应放在 `src/services/` 或专用 composable 中。
- Pinia store 只保存跨组件共享状态，局部渲染状态不要过度上移。
- 样式使用 SCSS，优先按组件局部维护；全局变量、混入和大屏主题 token 可集中管理。

## 验证要求

- 修改代码后优先运行 `npm run build` 验证基础构建。
- 涉及 3D 场景、地图交互、图表渲染或响应式布局时，需要通过浏览器实际检查视觉效果。
- 不要留下未使用的大段示例代码、调试日志或临时 mock，除非用户明确要求保留演示数据。
