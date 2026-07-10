---
name: echarts-panel
description: 基于设计稿和数据结构，使用 ECharts 创建 2D 图表组件。当需要创建数据可视化图表、图表面板或图表与 3D 场景联动时触发。
---

# ECharts 图表面板技能

## 触发条件

- 需要创建柱状图、折线图、饼图、雷达图、仪表盘、排行图等 2D 图表。
- 需要根据 Figma 设计稿还原图表样式。
- 需要图表与 3D 场景、地图区域、资源点或 WebSocket 数据联动。
- 需要封装可复用的大屏图表组件。

## 工作流程

1. 读取 `figma/screenshots/` 下的设计截图，确认图表类型、布局比例、标题层级和视觉风格。
2. 读取 `src/styles/variables.scss` 获取设计变量，包括颜色、字体、字号、发光色和面板间距。
3. 明确组件输入数据结构，优先通过 `props` 接收数据，不在组件内硬编码业务数据。
4. 创建 ECharts 实例并配置：
   - 图表类型，例如 `bar`、`line`、`pie`、`radar`、`gauge`。
   - 主题颜色与大屏风格一致。
   - 透明背景，与面板背景融合。
   - 坐标轴、网格线、图例、Tooltip 和 Label 样式。
   - 动画效果和高亮状态。
5. 封装为 Vue 3 组件，接收数据 `props`，必要时通过 `emit` 抛出点击、hover 或选中事件。
6. 实现响应式：监听容器尺寸变化，自动 `resize`。
7. 在组件卸载时销毁 ECharts 实例、清理事件监听和 `ResizeObserver`。

## 编码规则

- 图表组件放在 `src/components/Charts/` 目录。
- 使用 `<script setup>`。
- 如果项目已启用 TypeScript，可使用 `<script setup lang="ts">`；否则保持当前 JavaScript 项目结构，不要擅自引入 TypeScript 构建改造。
- ECharts 实例在 `onMounted` 中初始化，在 `onUnmounted` 中销毁。
- 使用 `ResizeObserver` 监听容器尺寸变化。
- 图表配置与数据分离，配置放在组件或配置工厂中，数据通过 `props` 传入。
- 颜色、字号、阴影色优先使用 `variables.scss` 中的变量或由 CSS 变量桥接。
- 背景保持透明，不要在图表组件中重绘 Figma 面板背景。
- 避免在每次数据变化时重复 `init`，应复用实例并调用 `setOption`。
- 图表交互需要和 3D 场景联动时，通过事件、Pinia store 或 composable 协调，不要让图表组件直接操作 Three.js 场景内部对象。

## 输出文件

- `src/components/Charts/` 下的对应图表组件
