---
name: websocket-integration
description: 封装 WebSocket 连接，实现实时数据推送、心跳检测、事件分发和自动重连。当需要接入实时数据、驱动图表更新或联动 3D 场景时触发。
---

# WebSocket 数据集成技能

## 触发条件

- 需要接入实时数据。
- 需要实现后端数据推送。
- 需要用实时数据驱动 ECharts 图表、3D 地图资源点、飞线或告警状态。
- 需要统一管理连接状态、断线重连、心跳和消息分发。

## 工作流程

1. 创建 WebSocket 服务模块：
   - 连接管理：连接、断开、重连、手动关闭。
   - 消息解析：默认按 JSON 解析，并对解析失败做容错处理。
   - 自动重连：使用指数退避策略。
   - 心跳检测：定时发送心跳并监听连接状态。
   - 事件订阅/发布：按消息类型分发给业务模块。
2. 创建 Pinia Store：
   - 存储实时数据状态。
   - 存储连接状态，例如 `idle`、`connecting`、`connected`、`disconnected`、`error`。
   - 提供数据访问和更新方法。
3. 组件中使用 Store 或 composable 获取数据，驱动图表和 3D 场景更新。
4. 断开组件或页面时，按业务需要决定是否保持全局连接，避免重复创建多个 WebSocket 实例。
5. 编写最小 mock 或本地兜底数据时，必须清楚标注，不得与真实接口地址混淆。

## 编码规则

- WebSocket 地址从 `import.meta.env.VITE_WS_URL` 读取。
- 禁止硬编码 WebSocket 地址。
- 缺少 `VITE_WS_URL` 时应给出明确错误或降级状态，不要静默失败。
- 重连策略：指数退避，最大间隔 30 秒。
- 心跳间隔：30 秒。
- 消息分发应基于 `type`、`event` 或后端约定字段，不要在组件里直接解析复杂消息。
- WebSocket 服务应避免依赖具体组件，保持可复用。
- 组件只消费 store/composable 暴露的数据，不直接持有底层 socket。
- 如果项目已启用 TypeScript，使用 TypeScript 定义消息类型；否则保持当前 JavaScript 项目结构，不要擅自引入 TypeScript 构建改造。

## 输出文件

默认 JavaScript 项目输出：

- `src/services/websocket.js`
- `src/stores/dashboard.js`

如果项目后续启用 TypeScript，则对应输出为：

- `src/services/websocket.ts`
- `src/stores/dashboard.ts`
