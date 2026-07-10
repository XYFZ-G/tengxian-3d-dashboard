---
name: 3d-map-builder
description: 基于视觉参考截图和 GeoJSON 数据，使用 Three.js 构建 3D 地图场景。当需要创建或修改 3D 地图、下钻交互、图标点位标注或地图视觉效果时触发。
---

# 3D 地图构建技能

## 触发条件

- 需要创建或修改 3D 地图场景
- 需要实现地图下钻交互
- 需要添加图标点位标注
- 需要实现地图 hover、高亮、Tooltip 或图标点位动画
- 需要根据视觉参考截图还原 3D 地图风格

## 工作流程

1. 读取 `references/` 目录下的参考截图、链接或说明，分析视觉风格，包括颜色、光照、视角、材质、边界线、辉光和动效。
2. 读取 `src/assets/map/` 下的 GeoJSON 数据，确认行政区层级、坐标结构、中心点和下钻路径。
3. 使用 Three.js 构建 3D 地图：
   - 基础地图：使用 `ExtrudeGeometry` 拉伸 GeoJSON 多边形。
   - 材质：使用 `MeshPhongMaterial`、`MeshStandardMaterial` 或自定义 `ShaderMaterial`。
   - 光照：使用 `AmbientLight`、`DirectionalLight`、`PointLight` 组合。
   - 边界：使用 `LineSegments`、`Line2` 或曲线描边增强行政区轮廓。
   - 后期处理：按需要使用 `UnrealBloomPass` 实现辉光效果。
4. 实现交互功能：
   - `OrbitControls`：支持旋转、缩放、平移，并限制合理视角范围。
   - 鼠标 hover 高亮区域。
   - 双击下钻到下一级行政区。
   - 面包屑导航回退到上级地图。
   - 点击空白或返回按钮时恢复默认视角。
5. 图标点位系统按需实现：
   - 当前基础地图阶段不默认生成散点和飞线。
   - 后续如需点位，根据地图数据和图标素材生成标注。
   - 点位优先使用图标纹理、Figma 切图或业务指定图片，不使用几何球体模拟。
   - 飞线动画默认不启用，除非用户明确要求。
   - 点位 Tooltip 应避免与地图区域 hover 状态冲突。
6. 完成后验证渲染、交互、销毁和窗口缩放行为。

## 编码规则

- 3D 逻辑封装在 `src/composables/` 中，例如 `useThreeScene.js`、`useMapInteraction.js`。
- 点位逻辑后续单独封装，优先命名为 `useMapIconPoints.js`，并基于图标素材和地图数据生成。
- 如果项目已启用 TypeScript，可使用 `.ts` 文件和 `<script setup lang="ts">`；否则保持 `.js` 与 `<script setup>`，不要擅自引入 TypeScript 构建改造。
- Vue 组件必须使用 `<script setup>`。
- GeoJSON 按行政区划层级存放，支持动态加载。
- 参考截图仅用于视觉风格参考，不用于素材提取。
- 场景销毁时必须清理 `geometry`、`material`、`texture`、事件监听器、动画帧和控制器，防止内存泄漏。
- Three.js 对象命名应清晰，例如 `mapGroup`、`boundaryGroup`、`iconPointGroup`。
- 地图坐标转换逻辑应集中封装，避免在组件中散落坐标换算。
- 不要把业务 WebSocket 数据直接写死在 3D 组件中，应通过 props、store 或 composable 注入。

## 输出文件

- `src/components/ThreeScene/MapScene.vue`
- `src/composables/useThreeScene.js`
- `src/composables/useMapInteraction.js`
- 后续按需新增 `src/composables/useMapIconPoints.js`

如果项目后续启用 TypeScript，则对应输出为：

- `src/composables/useThreeScene.ts`
- `src/composables/useMapInteraction.ts`
- 后续按需新增 `src/composables/useMapIconPoints.ts`
