<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { graphic, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import MapScene from './components/ThreeScene/MapScene.vue'

use([BarChart, PieChart, GridComponent, CanvasRenderer])

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const TOTAL_USERS_ICON = new URL('./assets/images/dashboard-icons/total-aggregated-users.png', import.meta.url).href
const TOTAL_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/total-aggregated-capacity.png', import.meta.url).href
const PEAK_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/peak-shaving-capacity.png', import.meta.url).href
const VALLEY_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/valley-filling-capacity.png', import.meta.url).href
const RESOURCE_ACCESS_ICON = new URL('../figma/screenshots/resource-access-rate-icon@1x.png', import.meta.url).href
const RESOURCE_ONLINE_ICON = new URL('../figma/screenshots/resource-online-rate-icon@1.5x.png', import.meta.url).href
const RESOURCE_AVAILABILITY_ICON = new URL('../figma/screenshots/resource-availability-icon@1.5x.png', import.meta.url).href
const DISTRIBUTED_PV_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/distributed-pv-capacity.png', import.meta.url).href
const DISTRIBUTED_WIND_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/distributed-wind-capacity.png', import.meta.url).href
const INTERRUPTIBLE_LOAD_SCALE_ICON = new URL('./assets/images/dashboard-icons/interruptible-load-scale.png', import.meta.url).href
const STORAGE_CALLABLE_CAPACITY_ICON = new URL('./assets/images/dashboard-icons/storage-callable-capacity.png', import.meta.url).href
const HEADER_BG_MOTION = new URL('../figma/screenshots/header-bg-motion@1x.png', import.meta.url).href
const PANEL_HEADER_MOTION = new URL('../figma/screenshots/panel-header-motion@1.5x.png', import.meta.url).href
const RESOURCE_TYPE_PIE_TOP = new URL('../figma/screenshots/resource-type-pie-top@1x.svg', import.meta.url).href
const RESOURCE_TYPE_PIE_CENTER = new URL('../figma/screenshots/resource-type-pie-center@1x.png', import.meta.url).href

const todayStatCards = [
  {
    icon: TOTAL_USERS_ICON,
    value: '2867',
    unit: 'kwh',
    label: '总聚合用户数',
  },
  {
    icon: TOTAL_CAPACITY_ICON,
    value: '748.2',
    unit: 'MW',
    label: '总聚合装机容量',
  },
  {
    icon: PEAK_CAPACITY_ICON,
    value: '368.8',
    unit: 'MW',
    label: '最大可削峰容量',
  },
  {
    icon: VALLEY_CAPACITY_ICON,
    value: '440.8',
    unit: 'MW',
    label: '最大可填谷容量',
  },
]

const todayProgressItems = [
  {
    icon: RESOURCE_ACCESS_ICON,
    label: '资源接入率',
    value: '87.9%',
  },
  {
    icon: RESOURCE_ONLINE_ICON,
    label: '资源在线率',
    value: '87.9%',
  },
  {
    icon: RESOURCE_AVAILABILITY_ICON,
    label: '资源可用率',
    value: '87.9%',
  },
]

const resourceCapacityCards = [
  {
    icon: DISTRIBUTED_PV_CAPACITY_ICON,
    value: '36.67',
    unit: 'MW',
    label: '分布式光伏容量',
  },
  {
    icon: DISTRIBUTED_WIND_CAPACITY_ICON,
    value: '48.47',
    unit: 'MWh',
    label: '分布式风电容量',
  },
  {
    icon: INTERRUPTIBLE_LOAD_SCALE_ICON,
    value: '56,789',
    unit: 'kwh',
    label: '可中断负荷规模',
  },
  {
    icon: STORAGE_CALLABLE_CAPACITY_ICON,
    value: '48.4',
    unit: 'MWh',
    label: '储能可调用容量',
  },
]

const resourceTypeLegendItems = [
  { label: '分布式光伏', installedCapacity: 286.4, adjustableRatio: 86.5, color: '#dfce53' },
  { label: '小微风电', installedCapacity: 56.8, adjustableRatio: 74.2, color: '#00d9ff' },
  { label: '可控工业负荷', installedCapacity: 168.5, adjustableRatio: 91.3, color: '#df5be2' },
  { label: '可控商业负荷', installedCapacity: 87.2, adjustableRatio: 88.7, color: '#0fd73e' },
  { label: '电化学储能', installedCapacity: 63.5, adjustableRatio: 82.6, color: '#e89644' },
  { label: '用户侧储能', installedCapacity: 51.6, adjustableRatio: 79.4, color: '#fe5f85' },
  { label: '公共充电桩', installedCapacity: 34.2, adjustableRatio: 68.8, color: '#917bff' },
]

const resourceTypeTotalCapacity = computed(() =>
  resourceTypeLegendItems.reduce((total, item) => total + item.installedCapacity, 0),
)

const resourceTypeAbilityItems = resourceTypeLegendItems.slice(0, 5)

const resourceQuantityBars = [
  { label: '光伏\n居民', value: 1120 },
  { label: '光伏\n工商', value: 735 },
  { label: '光伏\n农业', value: 915 },
  { label: '小微\n风电', value: 405 },
  { label: '电化\n储能', value: 850 },
  { label: '用户\n储能', value: 840 },
  { label: '公共\n充电', value: 1180 },
  { label: '专用\n充电', value: 160 },
]

const industryDistributionBars = [
  { label: '工业制造', value: 750 },
  { label: '商超商业', value: 730 },
  { label: '政务公共', value: 1040 },
  { label: '文旅产业', value: 890 },
  { label: '农业园区', value: 670 },
  { label: '居民小区', value: 890 },
]

const mapLegendItems = [
  { type: '光伏电站', color: '#dfce53' },
  { type: '风电场站', color: '#00d9ff' },
  { type: '储能设施', color: '#fe5f85' },
  { type: '充电桩群', color: '#917bff' },
  { type: '工商业负荷', color: '#0fd73e' },
]

const mapControlItems = [
  { action: 'parent', label: ['返回', '上层'] },
  { action: 'tilt', label: ['斜视', '视角'] },
  { action: 'top', label: ['俯视', '视角'] },
]

const headerLeftMenuItems = [
  { label: '资源', active: true },
  { label: '运行', active: false },
]

const headerRightMenuItems = [
  { label: '调控', active: false },
  { label: '交易', active: false },
]

const mapStatItems = [
  { value: '23', label: '乡镇覆盖', color: '#1efbff' },
  { value: '389', label: '资源点位', color: '#1efbff' },
  { value: '96.4%', label: '乡镇覆盖', color: '#0edb8d' },
]

const viewport = ref({
  width: typeof window === 'undefined' ? DESIGN_WIDTH : window.innerWidth,
  height: typeof window === 'undefined' ? DESIGN_HEIGHT : window.innerHeight,
})
const mapSceneRef = ref(null)
const visibleMarkerTypes = ref(mapLegendItems.map((item) => item.type))
const resourceTypePieChartRef = ref(null)
const resourceQuantityBarChartRef = ref(null)
const industryDistributionBarChartRef = ref(null)
const headerMotionLoaded = ref(false)
const panelHeaderMotionLoaded = ref(false)
const dataMotionResetting = ref(false)
const dashboardStageRef = ref(null)
const dashboardReady = ref(false)
const scoreProgress = ref(0)
let resourceTypePieChart = null
let resourceQuantityBarChart = null
let industryDistributionBarChart = null
let scoreAnimationFrame = 0
let dataMotionRestartFrame = 0
let dataRefreshTimer = 0
let dashboardLoadingTimeout = 0
let dashboardRevealRequested = false
const SCORE_ANIMATION_DURATION = 1200
const DATA_MOTION_REFRESH_INTERVAL = 5 * 60 * 1000
const DASHBOARD_LOADING_TIMEOUT = 60 * 1000

const isPortrait = computed(() => viewport.value.height > viewport.value.width)

const screenStageStyle = computed(() => {
  const { width, height } = viewport.value
  const scale = isPortrait.value
    ? Math.min(width / DESIGN_HEIGHT, height / DESIGN_WIDTH)
    : Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
  const rotate = isPortrait.value ? ' rotate(90deg)' : ''

  return {
    transform: `translate(-50%, -50%)${rotate} scale(${scale})`,
  }
})

function updateViewport() {
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  resourceTypePieChart?.resize()
  resourceQuantityBarChart?.resize()
  industryDistributionBarChart?.resize()
}

function waitForDashboardImages() {
  const images = Array.from(
    dashboardStageRef.value?.querySelectorAll(
      'img:not(.layout-header__motion-bg):not(.panel-header__motion-bg)',
    ) || [],
  )

  return Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve()

    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
    })
  }))
}

function revealDashboard() {
  if (dashboardReady.value || dashboardRevealRequested) return

  dashboardRevealRequested = true
  window.clearTimeout(dashboardLoadingTimeout)
  window.requestAnimationFrame(() => {
    dashboardReady.value = true
  })
}

async function finishDashboardLoading() {
  await Promise.all([
    waitForDashboardImages(),
    document.fonts?.ready || Promise.resolve(),
  ])

  revealDashboard()
}

function parseScoreValue(value) {
  const text = `${value}`
  const suffix = text.endsWith('%') ? '%' : ''
  const numericText = suffix ? text.slice(0, -1) : text
  const normalizedText = numericText.replace(/,/g, '')
  const target = Number(normalizedText)

  return {
    target,
    suffix,
    decimals: normalizedText.includes('.') ? normalizedText.split('.')[1].length : 0,
    useComma: numericText.includes(','),
  }
}

function formatScoreValue(value, meta) {
  const fixedValue = meta.decimals > 0
    ? value.toFixed(meta.decimals)
    : `${Math.round(value)}`
  const [integerText, decimalText] = fixedValue.split('.')
  const displayInteger = meta.useComma
    ? integerText.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : integerText

  return `${displayInteger}${decimalText ? `.${decimalText}` : ''}${meta.suffix}`
}

function displayScoreValue(value) {
  const meta = parseScoreValue(value)

  if (!Number.isFinite(meta.target)) return value
  if (scoreProgress.value >= 1) return value

  const progress = 1 - Math.pow(1 - scoreProgress.value, 3)
  return formatScoreValue(meta.target * progress, meta)
}

function formatResourceTypeShare(installedCapacity) {
  const share = (installedCapacity / resourceTypeTotalCapacity.value) * 100
  return `${share.toFixed(1)}%`
}

function startScoreAnimation() {
  const startTime = performance.now()

  const tick = (currentTime) => {
    scoreProgress.value = Math.min((currentTime - startTime) / SCORE_ANIMATION_DURATION, 1)

    if (scoreProgress.value < 1) {
      scoreAnimationFrame = requestAnimationFrame(tick)
    }
  }

  scoreProgress.value = 0
  scoreAnimationFrame = requestAnimationFrame(tick)
}

function replayDataAnimations() {
  cancelAnimationFrame(scoreAnimationFrame)
  cancelAnimationFrame(dataMotionRestartFrame)
  dataMotionResetting.value = true

  dataMotionRestartFrame = requestAnimationFrame(() => {
    resourceTypePieChart?.dispose()
    resourceQuantityBarChart?.dispose()
    industryDistributionBarChart?.dispose()
    resourceTypePieChart = null
    resourceQuantityBarChart = null
    industryDistributionBarChart = null

    initResourceTypePieChart()
    initResourceQuantityBarChart()
    initIndustryDistributionBarChart()

    dataMotionRestartFrame = requestAnimationFrame(() => {
      dataMotionResetting.value = false
      startScoreAnimation()
    })
  })
}

function toggleMarkerType(type) {
  const nextTypes = new Set(visibleMarkerTypes.value)

  if (nextTypes.has(type)) {
    nextTypes.delete(type)
  } else {
    nextTypes.add(type)
  }

  visibleMarkerTypes.value = Array.from(nextTypes)
}

function handleMapControl(action) {
  if (action === 'parent') {
    mapSceneRef.value?.returnToParentMap()
    return
  }

  if (action === 'tilt') {
    mapSceneRef.value?.focusTiltView()
    return
  }

  if (action === 'top') {
    mapSceneRef.value?.focusTopView()
  }
}

function initResourceTypePieChart() {
  if (!resourceTypePieChartRef.value) return

  const makePieData = () =>
    resourceTypeLegendItems.map((item) => ({
      value: item.installedCapacity,
      itemStyle: {
        color: new graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: item.color },
          { offset: 1, color: 'rgba(13, 28, 51, 0.72)' },
        ]),
      },
    }))
  const basePieSeries = {
    type: 'pie',
    center: ['50%', '50%'],
    clockwise: true,
    startAngle: 106,
    avoidLabelOverlap: false,
    minAngle: 0,
    padAngle: 0,
    silent: true,
    label: { show: false },
    labelLine: { show: false },
    itemStyle: {
      borderRadius: 8,
      borderColor: 'rgba(6, 14, 31, 0.9)',
      borderWidth: 2,
      shadowBlur: 8,
      shadowColor: 'rgba(0, 0, 0, 0.55)',
    },
  }

  resourceTypePieChart = init(resourceTypePieChartRef.value, null, {
    renderer: 'canvas',
    width: 152,
    height: 152,
  })
  resourceTypePieChart.setOption({
    animation: true,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (index) => index * 55,
    series: [
      {
        ...basePieSeries,
        radius: ['48%', '100%'],
        itemStyle: {
          ...basePieSeries.itemStyle,
          opacity: 0.2,
        },
        data: makePieData(),
      },
      {
        ...basePieSeries,
        radius: ['45%', '84%'],
        data: makePieData(),
      },
    ],
  })
}

function initResourceQuantityBarChart() {
  if (!resourceQuantityBarChartRef.value) return

  resourceQuantityBarChart = init(resourceQuantityBarChartRef.value, null, {
    renderer: 'canvas',
    width: 388,
    height: 192,
  })
  resourceQuantityBarChart.setOption({
    animation: true,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (index) => index * 70,
    grid: {
      top: 0,
      right: 0,
      bottom: 20,
      left: 31,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: resourceQuantityBars.map((item) => item.label),
      axisLine: {
        lineStyle: {
          color: 'rgba(13, 83, 132, 0.82)',
          width: 1,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#eff7fe',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        lineHeight: 10,
        interval: 0,
        margin: 6,
        formatter: (value) => value,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1500,
      interval: 300,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#5780bf',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        lineHeight: 16,
        width: 25,
        align: 'right',
        formatter: (value) => value === 1500 || value === 1200 ? value.toLocaleString() : `${value}`,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(40, 105, 170, 0.42)',
          type: [3, 5],
          width: 1,
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: resourceQuantityBars.map((item) => item.value),
        barWidth: 12,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00c8ff' },
            { offset: 1, color: 'rgba(0, 200, 255, 0.3)' },
          ]),
          shadowBlur: 10,
          shadowColor: 'rgba(0, 200, 255, 0.28)',
        },
      },
    ],
  })
}

function initIndustryDistributionBarChart() {
  if (!industryDistributionBarChartRef.value) return

  industryDistributionBarChart = init(industryDistributionBarChartRef.value, null, {
    renderer: 'canvas',
    width: 388,
    height: 192,
  })
  industryDistributionBarChart.setOption({
    animation: true,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (index) => index * 70,
    grid: {
      top: 0,
      right: 0,
      bottom: 12,
      left: 31,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: industryDistributionBars.map((item) => item.label),
      axisLine: {
        lineStyle: {
          color: 'rgba(13, 83, 132, 0.82)',
          width: 1,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#eff7fe',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        lineHeight: 10,
        interval: 0,
        margin: 6,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1500,
      interval: 300,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#5780bf',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        lineHeight: 16,
        width: 25,
        align: 'right',
        formatter: (value) => value === 1500 || value === 1200 ? value.toLocaleString() : `${value}`,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(40, 105, 170, 0.42)',
          type: [6, 8],
          width: 1,
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: industryDistributionBars.map((item) => item.value),
        barWidth: 12,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1ef39c' },
            { offset: 1, color: 'rgba(30, 243, 156, 0.2)' },
          ]),
          shadowBlur: 10,
          shadowColor: 'rgba(30, 249, 149, 0.28)',
        },
        markLine: {
          symbol: 'none',
          silent: true,
          label: { show: false },
          lineStyle: {
            color: '#049df0',
            width: 2,
          },
          data: [{ yAxis: 300 }],
        },
      },
    ],
  })
}

onMounted(() => {
  updateViewport()
  initResourceTypePieChart()
  initResourceQuantityBarChart()
  initIndustryDistributionBarChart()
  startScoreAnimation()
  dataRefreshTimer = window.setInterval(replayDataAnimations, DATA_MOTION_REFRESH_INTERVAL)
  dashboardLoadingTimeout = window.setTimeout(revealDashboard, DASHBOARD_LOADING_TIMEOUT)
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  cancelAnimationFrame(scoreAnimationFrame)
  cancelAnimationFrame(dataMotionRestartFrame)
  window.clearInterval(dataRefreshTimer)
  window.clearTimeout(dashboardLoadingTimeout)
  resourceTypePieChart?.dispose()
  resourceQuantityBarChart?.dispose()
  industryDistributionBarChart?.dispose()
  resourceTypePieChart = null
  resourceQuantityBarChart = null
  industryDistributionBarChart = null
})
</script>

<template>
  <main class="dashboard-viewport">
    <section
      ref="dashboardStageRef"
      class="dashboard-stage"
      :class="{
        'dashboard-stage--data-motion-resetting': dataMotionResetting,
        'dashboard-stage--ready': dashboardReady,
      }"
      :style="screenStageStyle"
    >
      <MapScene ref="mapSceneRef" :visible-marker-types="visibleMarkerTypes" @ready="finishDashboardLoading" />

      <div class="layout-shell">
        <div class="layout-mask layout-mask--left" />
        <div class="layout-mask layout-mask--right" />
        <div class="layout-mask layout-mask--top" />
        <div class="layout-mask layout-mask--bottom" />

        <header class="layout-header">
          <img
            class="layout-header__motion-bg"
            :class="{ 'layout-header__motion-bg--loaded': headerMotionLoaded }"
            :src="HEADER_BG_MOTION"
            alt=""
            @load="headerMotionLoaded = true"
          >
          <nav class="layout-header__menu layout-header__menu--left" aria-label="左侧菜单">
            <span
              v-for="item in headerLeftMenuItems"
              :key="item.label"
              class="layout-header__menu-item"
              :class="{ 'layout-header__menu-item--active': item.active }"
              :data-text="item.label"
            >
              <span>{{ item.label }}</span>
            </span>
          </nav>

          <h1 class="layout-header__title" data-text="藤县虚拟电厂平台">
            <span>藤县虚拟电厂平台</span>
          </h1>

          <nav class="layout-header__menu layout-header__menu--right" aria-label="右侧菜单">
            <span
              v-for="item in headerRightMenuItems"
              :key="item.label"
              class="layout-header__menu-item"
              :class="{ 'layout-header__menu-item--active': item.active }"
              :data-text="item.label"
            >
              <span>{{ item.label }}</span>
            </span>
          </nav>
        </header>
        <div class="layout-footer" />

        <section class="layout-panel layout-panel--left-top">
          <header class="today-panel__header">
            <img
              class="panel-header__motion-bg"
              :class="{ 'panel-header__motion-bg--loaded': panelHeaderMotionLoaded }"
              :src="PANEL_HEADER_MOTION"
              alt=""
              @load="panelHeaderMotionLoaded = true"
            >
            <h2 data-text="今日运行情况">
              <span>今日运行情况</span>
            </h2>
          </header>

          <div class="today-panel__content">
            <div class="today-panel__corner today-panel__corner--left" />
            <div class="today-panel__corner today-panel__corner--right" />

            <div class="today-panel__stat-grid">
              <article
                v-for="card in todayStatCards"
                :key="card.label"
                class="today-panel__stat-card"
              >
                <img class="today-panel__stat-icon" :src="card.icon" alt="">
                <strong>{{ displayScoreValue(card.value) }}</strong>
                <span>{{ card.unit }}</span>
                <p>{{ card.label }}</p>
              </article>
            </div>

            <div class="today-panel__progress-list">
              <article
                v-for="item in todayProgressItems"
                :key="item.label"
                class="today-panel__progress-item"
              >
                <img class="today-panel__progress-icon" :src="item.icon" alt="">
                <div class="today-panel__progress-main">
                  <div class="today-panel__progress-row">
                    <span>{{ item.label }}</span>
                    <strong>{{ displayScoreValue(item.value) }}</strong>
                  </div>
                  <div class="today-panel__progress-track">
                    <i />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="layout-panel layout-panel--left-bottom">
          <header class="screen-panel__header">
            <img
              class="panel-header__motion-bg"
              :class="{ 'panel-header__motion-bg--loaded': panelHeaderMotionLoaded }"
              :src="PANEL_HEADER_MOTION"
              alt=""
              @load="panelHeaderMotionLoaded = true"
            >
            <h2 data-text="资源类别分布">
              <span>资源类别分布</span>
            </h2>
          </header>
          <div class="screen-panel__content">
            <div class="screen-panel__corner screen-panel__corner--left" />
            <div class="screen-panel__corner screen-panel__corner--right" />

            <div class="resource-panel__stat-grid">
              <article
                v-for="card in resourceCapacityCards"
                :key="card.label"
                class="resource-panel__stat-card"
              >
                <img class="resource-panel__stat-icon" :src="card.icon" alt="">
                <strong>{{ displayScoreValue(card.value) }}</strong>
                <span>{{ card.unit }}</span>
                <p>{{ card.label }}</p>
              </article>
            </div>
          </div>
        </section>

        <section class="layout-panel layout-panel--right-top">
          <header class="screen-panel__header">
            <img
              class="panel-header__motion-bg"
              :class="{ 'panel-header__motion-bg--loaded': panelHeaderMotionLoaded }"
              :src="PANEL_HEADER_MOTION"
              alt=""
              @load="panelHeaderMotionLoaded = true"
            >
            <h2 data-text="资源类型结构分析">
              <span>资源类型结构分析</span>
            </h2>
          </header>
          <div class="screen-panel__content resource-structure-panel">
            <div class="screen-panel__corner screen-panel__corner--left" />
            <div class="screen-panel__corner screen-panel__corner--right" />

            <div class="resource-structure-panel__chart-row">
              <div class="resource-structure-panel__side-deco resource-structure-panel__side-deco--left" />

              <div class="resource-structure-panel__chart-main">
                <div class="resource-structure-panel__pie" aria-hidden="true">
                  <div ref="resourceTypePieChartRef" class="resource-structure-panel__pie-chart" />
                  <img class="resource-structure-panel__pie-top" :src="RESOURCE_TYPE_PIE_TOP" alt="">
                  <img class="resource-structure-panel__pie-center" :src="RESOURCE_TYPE_PIE_CENTER" alt="">
                  <strong>装机<br>占比</strong>
                </div>

                <div class="resource-structure-panel__legend">
                  <div
                    v-for="item in resourceTypeLegendItems"
                    :key="item.label"
                    class="resource-structure-panel__legend-item"
                  >
                    <i :style="{ backgroundColor: item.color }" />
                    <span>{{ item.label }}</span>
                    <strong :style="{ color: item.color }">{{ displayScoreValue(formatResourceTypeShare(item.installedCapacity)) }}</strong>
                  </div>
                </div>
              </div>

              <div class="resource-structure-panel__side-deco resource-structure-panel__side-deco--right" />
            </div>

              <div class="resource-structure-panel__ability">
                <div class="resource-structure-panel__subtitle">
                <i class="resource-structure-panel__subtitle-deco" />
                <span class="resource-structure-panel__subtitle-text">各类可调能力占比</span>
                <i class="resource-structure-panel__subtitle-deco resource-structure-panel__subtitle-deco--right" />
              </div>

              <div class="resource-structure-panel__bar-list">
                <div
                  v-for="item in resourceTypeAbilityItems"
                  :key="item.label"
                  class="resource-structure-panel__bar-item"
                >
                  <span>{{ item.label }}</span>
                  <div class="resource-structure-panel__bar-track">
                    <i :style="{ '--bar-color': item.color, '--bar-width': `${item.adjustableRatio}%` }" />
                  </div>
                  <strong :style="{ color: item.color }">{{ displayScoreValue(`${item.adjustableRatio}%`) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="layout-panel layout-panel--right-middle">
          <header class="screen-panel__header">
            <img
              class="panel-header__motion-bg"
              :class="{ 'panel-header__motion-bg--loaded': panelHeaderMotionLoaded }"
              :src="PANEL_HEADER_MOTION"
              alt=""
              @load="panelHeaderMotionLoaded = true"
            >
            <h2 data-text="分布式资源数量结构">
              <span>分布式资源数量结构</span>
            </h2>
          </header>
          <div class="screen-panel__content resource-quantity-panel">
            <div class="screen-panel__corner screen-panel__corner--left" />
            <div class="screen-panel__corner screen-panel__corner--right" />
            <div ref="resourceQuantityBarChartRef" class="resource-quantity-panel__chart" />
          </div>
        </section>

        <section class="layout-panel layout-panel--right-bottom">
          <header class="screen-panel__header">
            <img
              class="panel-header__motion-bg"
              :class="{ 'panel-header__motion-bg--loaded': panelHeaderMotionLoaded }"
              :src="PANEL_HEADER_MOTION"
              alt=""
              @load="panelHeaderMotionLoaded = true"
            >
            <h2 data-text="行业分布">
              <span>行业分布</span>
            </h2>
          </header>
          <div class="screen-panel__content industry-distribution-panel">
            <div class="screen-panel__corner screen-panel__corner--left" />
            <div class="screen-panel__corner screen-panel__corner--right" />
            <div ref="industryDistributionBarChartRef" class="industry-distribution-panel__chart" />
          </div>
        </section>

        <div class="layout-map-stats">
          <article
            v-for="item in mapStatItems"
            :key="item.label + item.value"
            class="layout-map-stat"
            :style="{ '--map-stat-color': item.color }"
          >
            <strong>{{ displayScoreValue(item.value) }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>

        <div class="layout-map-controls" role="group" aria-label="地图视角控制">
          <button
            v-for="item in mapControlItems"
            :key="item.action"
            class="layout-control-button"
            type="button"
            :aria-label="item.label.join('')"
            @click="handleMapControl(item.action)"
          >
            <span>{{ item.label[0] }}</span>
            <span>{{ item.label[1] }}</span>
          </button>
        </div>

        <div class="layout-map-legend" role="group" aria-label="地图点位类型筛选">
          <button
            v-for="item in mapLegendItems"
            :key="item.type"
            class="layout-map-legend__item"
            :class="{ 'layout-map-legend__item--inactive': !visibleMarkerTypes.includes(item.type) }"
            type="button"
            :aria-pressed="visibleMarkerTypes.includes(item.type)"
            @click="toggleMarkerType(item.type)"
          >
            <i :style="{ backgroundColor: item.color, '--legend-dot-color': item.color }" />
            <span>{{ item.type }}</span>
          </button>
        </div>
      </div>
    </section>

    <section v-if="!dashboardReady" class="dashboard-loading" aria-live="polite" aria-label="大屏加载中">
      <div class="dashboard-loading__orb" />
      <p>系统加载中</p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
@keyframes dataFadeIn {
  0% {
    opacity: 0;
    filter: brightness(1.8) blur(1px);
  }

  100% {
    opacity: 1;
    filter: brightness(1) blur(0);
  }
}

@keyframes dataFillGrow {
  0% {
    opacity: 0.35;
    transform: scaleX(0);
  }

  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes layoutEnterFromTop {
  from {
    opacity: 0;
    transform: translate3d(0, -48px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes layoutEnterFromBottom {
  from {
    opacity: 0;
    transform: translate3d(0, 48px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes layoutEnterFromLeft {
  from {
    opacity: 0;
    transform: translate3d(-64px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes layoutEnterFromRight {
  from {
    opacity: 0;
    transform: translate3d(64px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.dashboard-stage--data-motion-resetting {
  .resource-structure-panel__legend-item strong,
  .resource-structure-panel__bar-item strong,
  .resource-structure-panel__bar-track i,
  .resource-panel__stat-card strong,
  .resource-panel__stat-card span,
  .today-panel__stat-card strong,
  .today-panel__stat-card span,
  .today-panel__progress-row strong,
  .today-panel__progress-track i,
  .layout-map-stat strong,
  .layout-map-stat span {
    animation: none;
  }
}

.dashboard-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #030b18;
}

.dashboard-loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-content: center;
  gap: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgba(12, 102, 174, 0.24), transparent 23%),
    #030b18;
  color: #8df8ff;
  font-family: 'YouSheBiaoTiHei', 'Microsoft YaHei', sans-serif;
  letter-spacing: 4px;
}

.dashboard-loading__orb {
  width: 54px;
  height: 54px;
  margin: 0 auto;
  border: 3px solid rgba(89, 239, 255, 0.2);
  border-top-color: #63f5ff;
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(45, 222, 255, 0.5);
  animation: dashboardLoadingSpin 900ms linear infinite;
}

.dashboard-loading p {
  margin: 0;
  font-size: 22px;
  line-height: 1;
  text-shadow: 0 0 12px rgba(45, 222, 255, 0.65);
}

.dashboard-stage {
  --data-enter-duration: 680ms;
  --data-fill-duration: 900ms;
  --data-enter-easing: cubic-bezier(0.22, 0.61, 0.36, 1);

  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  transform-origin: center center;
  background: #061224;
  opacity: 0;
  visibility: hidden;
  transition: opacity 280ms ease;
}

.dashboard-stage--ready {
  opacity: 1;
  visibility: visible;
}

.layout-shell {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.layout-mask {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}

.layout-mask--left {
  top: 0;
  bottom: 0;
  left: 0;
  width: 600px;
  background: linear-gradient(90deg, rgba(2, 10, 25, 0.9), rgba(2, 10, 25, 0));
}

.layout-mask--right {
  top: 0;
  right: 0;
  bottom: 0;
  width: 600px;
  background: linear-gradient(270deg, rgba(2, 10, 25, 0.9), rgba(2, 10, 25, 0));
}

.layout-mask--top {
  top: 0;
  right: 0;
  left: 0;
  height: 280px;
  background: linear-gradient(180deg, rgba(2, 10, 25, 0.78), rgba(2, 10, 25, 0));
}

.layout-mask--bottom {
  right: 0;
  bottom: 0;
  left: 0;
  height: 200px;
  background: linear-gradient(0deg, rgba(2, 10, 25, 0.86), rgba(2, 10, 25, 0));
}

.layout-header,
.layout-footer,
.layout-panel,
.layout-map-stats,
.layout-map-controls,
.layout-map-legend {
  position: absolute;
  z-index: 2;
}

.dashboard-stage--ready .layout-header {
  top: 0;
  left: 0;
  width: 1920px;
  height: 82px;
  overflow: hidden;
  background: url('../figma/screenshots/header-bg@1.5x.png') center top / 1920px 82px no-repeat;
  animation: layoutEnterFromTop 680ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.layout-header__motion-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 1920px;
  height: 82px;
  object-fit: fill;
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms linear;
}

.layout-header__motion-bg--loaded {
  opacity: 1;
}

.layout-header__title {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 2;
  width: max-content;
  margin: 0;
  font-family: 'YouSheBiaoTiHei', 'Microsoft YaHei', sans-serif;
  font-size: 46px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 3.68px;
  text-align: center;
  white-space: nowrap;
  transform: translateX(-50%);
}

.layout-header__title::before {
  position: absolute;
  inset: 0;
  top: 3px;
  z-index: 1;
  color: transparent;
  content: attr(data-text);
  text-shadow:
    0 2px 0 rgba(19, 110, 159, 0.95),
    0 5px 7px rgba(3, 15, 33, 0.72);
}

.layout-header__title span {
  position: relative;
  z-index: 2;
  display: block;
  background: linear-gradient(180deg, #ffffff 22.5%, #5dfcff 76.67%);
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.layout-header__menu {
  position: absolute;
  top: 5px;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 54px;
}

.layout-header__menu--left {
  left: 191px;
}

.layout-header__menu--right {
  left: 1481px;
}

.layout-header__menu-item {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 125px;
  height: 54px;
  font-family: 'YouSheBiaoTiHei', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 1.92px;
  text-align: center;
  white-space: nowrap;
}

.layout-header__title::before {
  position: absolute;
  top: 1px;
  left: 33.5%;
  z-index: 1;
  color: transparent;
  content: attr(data-text);
  text-shadow:
    0 1.4px 0 rgba(7, 74, 122, 0.86),
    0 4px 5px rgba(3, 15, 33, 0.66);
  transform: translateX(-50%);
}

.layout-header__menu-item span {
  position: relative;
  z-index: 2;
  display: block;
  background: linear-gradient(180deg, #b2f0ff 22.5%, #268bc8 76.67%);
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.layout-header__menu-item--active {
  color: inherit;
}

.layout-header__menu-item--active span {
  background: linear-gradient(180deg, #ffffff 22.5%, #5dfcff 76.67%);
  background-clip: text;
  -webkit-background-clip: text;
}

.layout-header__menu-item--active::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: url('../figma/screenshots/header-menu-active-bg@1x.svg') center / 125px 54px no-repeat;
  content: '';
}

.dashboard-stage--ready .layout-footer {
  bottom: 0;
  left: 0;
  width: 1920px;
  height: 32px;
  background: url('../figma/screenshots/footer-bg@1.5x.png') center bottom / 1920px 32px no-repeat;
  animation: layoutEnterFromBottom 620ms cubic-bezier(0.22, 0.61, 0.36, 1) 560ms both;
}

.layout-panel {
  width: 420px;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.dashboard-stage--ready .layout-panel--left-top {
  top: 82px;
  left: 20px;
  height: 568px;
  animation: layoutEnterFromLeft 760ms cubic-bezier(0.22, 0.61, 0.36, 1) 120ms both;
}

.dashboard-stage--ready .layout-panel--left-bottom {
  top: 666px;
  left: 20px;
  height: 372px;
  animation: layoutEnterFromLeft 760ms cubic-bezier(0.22, 0.61, 0.36, 1) 260ms both;
}

.dashboard-stage--ready .layout-panel--right-top {
  top: 82px;
  right: 20px;
  height: 403px;
  animation: layoutEnterFromRight 760ms cubic-bezier(0.22, 0.61, 0.36, 1) 160ms both;
}

.dashboard-stage--ready .layout-panel--right-middle {
  top: 502px;
  right: 20px;
  height: 258px;
  animation: layoutEnterFromRight 760ms cubic-bezier(0.22, 0.61, 0.36, 1) 300ms both;
}

.dashboard-stage--ready .layout-panel--right-bottom {
  top: 776px;
  right: 20px;
  height: 257px;
  animation: layoutEnterFromRight 760ms cubic-bezier(0.22, 0.61, 0.36, 1) 440ms both;
}

.screen-panel__header,
.today-panel__header {
  position: relative;
  width: 420px;
  height: 38px;
  overflow: hidden;
  background: url('../figma/screenshots/panel-today-header@1.5x.png') left top / 420px 38px no-repeat;

  .panel-header__motion-bg {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: block;
    width: 420px;
    height: 38px;
    object-fit: fill;
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms linear;
  }

  .panel-header__motion-bg--loaded {
    opacity: 1;
  }

  h2 {
    position: absolute;
    top: 1px;
    left: 48px;
    z-index: 2;
    width: 220px;
    height: 29px;
    margin: 0;
    overflow: hidden;
    font-family: 'YouSheBiaoTiHei', 'Microsoft YaHei', sans-serif;
    font-size: 22px;
    font-weight: 400;
    line-height: 29px;
    letter-spacing: 0;
    white-space: nowrap;
  }

  h2::before {
    position: absolute;
    inset: 0;
    top: -1px;
    z-index: 1;
    color: transparent;
    content: attr(data-text);
    text-shadow:
      0 1.5px 0 rgba(8, 91, 150, 0.95),
      0 4px 6px rgba(0, 29, 72, 0.78);
  }

  h2 span {
    position: relative;
    z-index: 2;
    display: block;
    background: linear-gradient(180deg, #ffffff 18%, #d6feff 48%, #5dfcff 82%);
    background-clip: text;
    color: transparent;
    -webkit-background-clip: text;
    -webkit-font-smoothing: antialiased;
    -webkit-text-fill-color: transparent;
  }
}

.screen-panel__content,
.today-panel__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  width: 420px;
  height: calc(100% - 38px);
  padding: 12px 16px 16px;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(15, 30, 58, 0) 0%,
    rgba(15, 30, 58, 0.9) 30%,
    rgba(9, 47, 93, 0.9) 100%
  );
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.screen-panel__content::before,
.today-panel__content::before {
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 1px;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(180deg, rgba(16, 110, 152, 0) 0%, #1ab8fe 100%);
  content: '';
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.screen-panel__content::after,
.today-panel__content::after {
  content: none;
}

.screen-panel__corner,
.today-panel__corner {
  position: absolute;
  bottom: 0;
  z-index: 1;
  width: 76px;
  height: 76px;
  pointer-events: none;
}

.screen-panel__corner--left,
.today-panel__corner--left {
  left: 0;
  background: url('../figma/screenshots/panel-content-bottom-left-deco@1.5x.png') left bottom / 76px 76px no-repeat;
}

.screen-panel__corner--right,
.today-panel__corner--right {
  right: 0;
  background: url('../figma/screenshots/panel-content-bottom-right-deco@1.5x.png') right bottom / 76px 76px no-repeat;
}

.resource-quantity-panel {
  gap: 0;
}

.resource-quantity-panel__chart {
  position: relative;
  z-index: 1;
  width: 388px;
  height: 192px;
}

.industry-distribution-panel {
  gap: 0;
}

.industry-distribution-panel__chart {
  position: relative;
  z-index: 1;
  width: 388px;
  height: 192px;
}

.resource-structure-panel {
  gap: 20px;
  align-items: center;
}

.resource-structure-panel__chart-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 388px;
  height: 172px;
}

.resource-structure-panel__side-deco {
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 172px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.resource-structure-panel__side-deco--left {
  background-image: url('../figma/screenshots/resource-structure-side-left@1x.png');
}

.resource-structure-panel__side-deco--right {
  background-image: url('../figma/screenshots/resource-structure-side-right@1x.png');
}

.resource-structure-panel__chart-main {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 310px;
  height: 172px;
}

.resource-structure-panel__pie {
  position: relative;
  flex: 0 0 auto;
  width: 162px;
  height: 172px;
  overflow: visible;
}

.resource-structure-panel__pie-chart,
.resource-structure-panel__pie img,
.resource-structure-panel__pie strong {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.resource-structure-panel__pie-chart {
  z-index: 2;
  width: 152px;
  height: 152px;
}

.resource-structure-panel__pie-top {
  z-index: 4;
  width: 152px;
  height: 152px;
}

.resource-structure-panel__pie-center {
  z-index: 1;
  width: 180px;
  height: 83px;
  object-fit: cover;
  --pie-center-x: -4px;
  --pie-center-y: -3px;
}

.resource-structure-panel__pie strong {
  z-index: 5;
  margin: 0;
  background: linear-gradient(180deg, #effcff 19.44%, #5dfcff 91.67%);
  background-clip: text;
  color: transparent;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.resource-structure-panel__legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 140px;
}

.resource-structure-panel__legend-item {
  display: grid;
  grid-template-columns: 8px 72px 38px;
  gap: 6px;
  align-items: center;
  width: 140px;
  height: 16px;
}

.resource-structure-panel__legend-item i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.resource-structure-panel__legend-item span,
.resource-structure-panel__bar-item > span {
  color: #eff7fe;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.resource-structure-panel__bar-item > span {
  width: 6em;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.resource-structure-panel__legend-item strong,
.resource-structure-panel__bar-item strong {
  margin: 0;
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  font-family: 'AlibabaPuHuiTi', Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  white-space: nowrap;
}

.resource-structure-panel__ability {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: 388px;
}

.resource-structure-panel__subtitle {
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  height: 18px;
}

.resource-structure-panel__subtitle-deco {
  position: relative;
  display: block;
  width: 55px;
  height: 9px;
  background: url('../figma/screenshots/resource-type-subtitle-left@1x.png') center / 55px 9px no-repeat;
}

.resource-structure-panel__subtitle-deco--right {
  background-image: url('../figma/screenshots/resource-type-subtitle-right@1x.png');
}

.resource-structure-panel__subtitle-text {
  background: linear-gradient(180deg, #effcff 19.44%, #5dfcff 91.67%);
  background-clip: text;
  color: transparent;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.resource-structure-panel__bar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 388px;
}

.resource-structure-panel__bar-item {
  --ability-label-width: 5em;
  --ability-column-gap: 8px;

  display: grid;
  grid-template-columns: var(--ability-label-width) 1fr 38px;
  column-gap: var(--ability-column-gap);
  align-items: center;
  width: 388px;
  height: 16px;
}

.resource-structure-panel__bar-track {
  display: flex;
  align-items: flex-start;
  height: 8px;
  padding: 2px;
  overflow: hidden;
  border-radius: 100px;
  background: #0b1b2f;
}

.resource-structure-panel__bar-track i {
  width: var(--bar-width);
  height: 4px;
  border-radius: 100px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--bar-color) 20%, transparent), var(--bar-color));
  transform-origin: left center;
  animation: dataFillGrow var(--data-fill-duration) var(--data-enter-easing) both;
}

.resource-panel__stat-grid,
.today-panel__stat-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 190px);
  gap: 6px 8px;
  width: 388px;
  height: 306px;
}

.resource-panel__stat-card,
.today-panel__stat-card {
  position: relative;
  width: 190px;
  height: 150px;
  margin: 0;
  overflow: hidden;
  background: url('../figma/screenshots/stat-card-bg@1.5x.png') center / 190px 150px no-repeat;
}

.resource-panel__stat-icon,
.today-panel__stat-icon {
  position: absolute;
  top: 0;
  left: 60px;
  display: block;
  width: 70px;
  height: 70px;
  object-fit: contain;
}

.resource-panel__stat-card strong,
.resource-panel__stat-card span,
.resource-panel__stat-card p,
.today-panel__stat-card strong,
.today-panel__stat-card span,
.today-panel__stat-card p {
  position: absolute;
  right: 0;
  left: 0;
  margin: 0;
  text-align: center;
  letter-spacing: 0;
}

.resource-panel__stat-card strong,
.today-panel__stat-card strong {
  top: 73px;
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  color: #1efbff;
  font-family: 'AlibabaPuHuiTi', Arial, sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 22px;
}

.resource-panel__stat-card span,
.today-panel__stat-card span {
  top: 99px;
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  color: rgba(30, 251, 255, 0.5);
  font-family: 'AlibabaPuHuiTi', Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 12px;
}

.resource-panel__stat-card p,
.today-panel__stat-card p {
  top: 115px;
  color: #eff7fe;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 16px;
}

.today-panel__progress-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 11px;
  width: 388px;
  height: 184px;
}

.today-panel__progress-item {
  position: relative;
  width: 388px;
  height: 54px;
  margin: 0;
  overflow: hidden;
  background: url('../figma/screenshots/stat-card-wide-bg@1.5x.png') center / 388px 54px no-repeat;
}

.today-panel__progress-icon {
  position: absolute;
  top: 4px;
  left: 12px;
  display: block;
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.today-panel__progress-main {
  position: absolute;
  top: 6px;
  left: 68px;
  width: 310px;
  height: 42px;
}

.today-panel__progress-row {
  position: absolute;
  top: 4px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 310px;
  height: 18px;
}

.today-panel__progress-row span {
  color: #eff7fe;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
}

.today-panel__progress-row strong {
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  color: #0edb8d;
  font-family: 'AlibabaPuHuiTi', Arial, sans-serif;
  font-size: 14px;
  font-weight: 700;
  line-height: 16px;
  text-align: right;
}

.today-panel__progress-track {
  --today-progress-track-y: 26px;
  --today-progress-track-x: 0px;
  --today-progress-rail-y: 2px;
  --today-progress-fill-y: 3px;

  position: absolute;
  top: var(--today-progress-track-y);
  left: var(--today-progress-track-x);
  width: 310px;
  height: 10px;
}

.today-panel__progress-track::before {
  position: absolute;
  top: var(--today-progress-rail-y);
  left: 2px;
  width: 296px;
  height: 6px;
  border-radius: 4px;
  background: rgba(1, 13, 24, 0.72);
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.68);
  content: '';
}

.today-panel__progress-track i {
  position: absolute;
  top: var(--today-progress-fill-y);
  left: 3px;
  width: 260px;
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, #0d8d75 0%, #19e889 100%);
  box-shadow: 0 0 8px rgba(25, 232, 137, 0.5);
  transform-origin: left center;
  animation: dataFillGrow var(--data-fill-duration) var(--data-enter-easing) both;
}

.layout-card-grid {
  position: absolute;
  top: 67px;
  left: 17px;
  display: grid;
  grid-template-columns: repeat(2, 190px);
  gap: 28px 10px;
}

.layout-card-grid--bottom {
  top: 42px;
  gap: 28px 10px;
}

.layout-stat-card {
  width: 190px;
  height: 150px;
  background: url('../figma/screenshots/stat-card-bg@1.5x.png') center / 190px 150px no-repeat;
}

.layout-wide-list {
  position: absolute;
  right: 16px;
  bottom: 16px;
  left: 16px;
  display: grid;
  gap: 12px;
}

.layout-wide-card {
  height: 55px;
  background: url('../figma/screenshots/stat-card-wide-bg@1.5x.png') center / 388px 55px no-repeat;
}

.dashboard-stage--ready .layout-map-stats {
  top: 110px;
  left: 589px;
  display: grid;
  grid-template-columns: repeat(3, 234px);
  gap: 20px;
  width: 742px;
  height: 88px;
  animation: layoutEnterFromTop 680ms cubic-bezier(0.22, 0.61, 0.36, 1) 180ms both;
}

.layout-map-stat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  width: 234px;
  height: 88px;
  padding-top: 0;
  background: url('../figma/screenshots/map-top-data-bg@1.5x.png') center / 234px 88px no-repeat;
  text-align: center;
  white-space: nowrap;
}

.layout-map-stat strong {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  margin: 0;
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  color: var(--map-stat-color);
  font-family: 'AlibabaPuHuiTi', 'DIN Alternate', Arial, sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: 0;
}

.layout-map-stat span {
  display: block;
  height: 22px;
  margin: 0;
  animation: dataFadeIn var(--data-enter-duration) var(--data-enter-easing) both;
  color: #eff7fe;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: 0;
}

.dashboard-stage--ready .layout-map-controls {
  top: 918px;
  left: 865px;
  display: grid;
  grid-template-columns: repeat(3, 50px);
  gap: 20px;
  width: 190px;
  height: 50px;
  pointer-events: auto;
  animation: layoutEnterFromBottom 620ms cubic-bezier(0.22, 0.61, 0.36, 1) 460ms both;
}

.layout-control-button {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  padding: 0;
  border: 4px solid rgba(21, 104, 202, 0.2);
  border-radius: 100px;
  background: url('../figma/screenshots/map-control-button-bg@1.5x.png') center / 50px 50px no-repeat;
  color: #aed8ff;
  cursor: pointer;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  text-shadow: 0 1.143px 2.286px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.layout-control-button span {
  display: block;
  height: 14px;
}

.dashboard-stage--ready .layout-map-legend {
  top: 1002px;
  left: 631px;
  display: flex;
  gap: 31.57px;
  align-items: center;
  justify-content: center;
  width: 658px;
  height: 34px;
  padding: 6px 55.86px;
  background: url('../figma/screenshots/map-legend-bg@1.5x.png') center / 658px 34px no-repeat;
  pointer-events: auto;
  animation: layoutEnterFromBottom 620ms cubic-bezier(0.22, 0.61, 0.36, 1) 520ms both;
}

.layout-map-legend__item {
  display: flex;
  gap: 7.29px;
  align-items: center;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #aed8ff;
  cursor: pointer;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 15.79px;
  font-weight: 400;
  line-height: 22px;
  white-space: nowrap;
  transition:
    opacity 160ms ease,
    filter 160ms ease;
}

.layout-map-legend__item i {
  flex: 0 0 auto;
  width: 9.71px;
  height: 9.71px;
  border-radius: 50%;
  box-shadow: 0 0 7px var(--legend-dot-color);
}

.layout-map-legend__item span {
  display: block;
}

.layout-map-legend__item--inactive {
  opacity: 0.36;
  filter: saturate(0.35);
}

@media (prefers-reduced-motion: reduce) {
  .layout-header,
  .layout-footer,
  .layout-panel--left-top,
  .layout-panel--left-bottom,
  .layout-panel--right-top,
  .layout-panel--right-middle,
  .layout-panel--right-bottom,
  .layout-map-stats,
  .layout-map-controls,
  .layout-map-legend {
    animation: none;
  }
}

@keyframes dashboardLoadingSpin {
  to {
    transform: rotate(360deg);
  }
}
</style>
