import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

// 可替换贴图槽位：后续换地图时只要保持文件名，地面纹理和旋转圆环会自动使用新素材。
const GROUND_TECH_OVERLAY_URL = new URL('../assets/textures/ground-tech-overlay.webp', import.meta.url).href
const GROUND_EXTRA_OVERLAY_URL = new URL('../assets/textures/ground-extra-overlay.webp', import.meta.url).href
const MODEL_ORBIT_RING_URL = new URL('../assets/textures/model-orbit-ring.webp', import.meta.url).href

// 地图基础比例和初始镜头。换地图后优先调 MAP_SCALE_SIZE、CAMERA_HOME_POSITION、CAMERA_HOME_TARGET。
const DEFAULT_MAP_HEIGHT = 2.8
const MAP_SCALE_SIZE = 78
const MAP_MODEL_LIGHT_LAYER = 1
const MAP_MODEL_ELEVATION = 2.2
const CAMERA_HOME_POSITION = new THREE.Vector3(7.77, 89.52, 99.2)
const CAMERA_TOP_POSITION = new THREE.Vector3(5.39, 128.05, 70.8)
const CAMERA_INTRO_START_POSITION = new THREE.Vector3(6.56, 168.05, 93.08)
const CAMERA_HOME_TARGET = new THREE.Vector3(1.05, 1.14, 2.45)
const CAMERA_TOP_TARGET = new THREE.Vector3(1.72, 2.12, 0.65)
const CAMERA_INTRO_START_TARGET = new THREE.Vector3(1.72, 2.12, 0.65)
const CAMERA_MIN_POLAR_ANGLE = Math.PI * 0.16
const CAMERA_MAX_POLAR_ANGLE = Math.PI * 0.34
const CAMERA_INTRO_DURATION = 1800

// 模型投影阴影：用外轮廓复制多层透明面模拟模糊阴影，比实时阴影更稳定。
const MAP_OUTLINE_SHADOW_HEIGHT = 0.26
const MAP_OUTLINE_SHADOW_OPACITY = 0.3
const MAP_OUTLINE_SHADOW_BLUR_STEPS = 11
const MAP_OUTLINE_SHADOW_BLUR_SCALE = 0.035

// 地图主视觉颜色：顶面以 #1D79C9 为基准，侧面更深，边线单独控制。
const MAP_BASE_COLOR = 0x1d79c9
const MAP_SIDE_COLOR = 0x12528f
const MAP_TOP_EMISSIVE_COLOR = 0x0a68a8
const MAP_TOP_EMISSIVE_INTENSITY = 0.34
const MAP_SIDE_EMISSIVE_COLOR = 0x064778
const MAP_SIDE_EMISSIVE_INTENSITY = 0.3
const MAP_TOP_LINE_COLOR = 0x1a9ed3
const MAP_OUTER_LINE_COLOR = 0x1db4ff

// 整体顶面渐变膜，只覆盖外轮廓大面，不给每个镇单独叠加。
const MAP_TOP_GRADIENT_OVERLAY_COLOR = 0x40ffe9
const MAP_TOP_GRADIENT_OVERLAY_OPACITY = 0.36
const MAP_TOP_GRADIENT_OVERLAY_OFFSET = 0.035
const MAP_LINE_SURFACE_OFFSET = 0.08
const MAP_OUTER_LINE_SURFACE_OFFSET = 0.16
const MAP_MIDDLE_OUTER_LINE_RATIO = 0.5

// 镇名标签由 Canvas 生成 Sprite，独立 labelScene 渲染，避免参与辉光。
const TOWN_LABEL_FONT_SIZE = 12
const TOWN_LABEL_FONT_WEIGHT = 700
const TOWN_LABEL_LINE_HEIGHT = 12
const TOWN_LABEL_SURFACE_OFFSET = 0.56
const TOWN_LABEL_SCALE = 0.08
const TOWN_CHILD_LABEL_SCALE = 0.11

// 经纬度点位测试类型。后续正式接业务数据时可改为 props/store 注入，不再运行时随机生成。
const TEST_GEO_MARKER_TYPES = [
  { type: '光伏电站', color: 0xdfce53 },
  { type: '风电场站', color: 0x00d9ff },
  { type: '储能设施', color: 0xfe5f85 },
  { type: '充电桩群', color: 0x917bff },
  { type: '工商业负荷', color: 0x0fd73e },
]
const TEST_GEO_MARKER_COUNT_PER_TYPE = 6
const GEO_MARKER_SURFACE_OFFSET = 0.82
const GEO_MARKER_SIZE = 1.28

// 地面科技叠加层：size 越小纹理重复越密，opacity 控制叠加存在感。
const GROUND_TECH_OVERLAY_SIZE = 50
const GROUND_TECH_OVERLAY_OPACITY = 0.075
const GROUND_EXTRA_OVERLAY_SIZE = 32
const GROUND_EXTRA_OVERLAY_OPACITY = 0.12

// 模型下方旋转圆环，位于模型和地面之间。
const MODEL_ORBIT_RING_SIZE = 96
const MODEL_ORBIT_RING_OPACITY = 0.62
const MODEL_ORBIT_RING_HEIGHT = MAP_MODEL_ELEVATION - 0.35
const MODEL_ORBIT_RING_ROTATION_SPEED = 0.000045

// 空间粒子点：从地面附近生成，垂直上升并柔和淡出。
const SPACE_LIGHT_STREAK_COUNT = 72
const SPACE_LIGHT_STREAK_INNER_RADIUS = 26
const SPACE_LIGHT_STREAK_AREA_RADIUS = 92
const SPACE_LIGHT_STREAK_MIN_HEIGHT = 0.42
const SPACE_LIGHT_STREAK_MAX_HEIGHT = 0.95
const SPACE_LIGHT_STREAK_BASE_Y = 0.08
const SPACE_LIGHT_STREAK_WIDTH = 0.42
const SPACE_LIGHT_STREAK_MAX_OPACITY = 0.54
const SPACE_LIGHT_STREAK_MIN_RISE = 14
const SPACE_LIGHT_STREAK_MAX_RISE = 28
const SPACE_LIGHT_STREAK_MIN_DURATION = 3200
const SPACE_LIGHT_STREAK_MAX_DURATION = 6200
export const DEFAULT_GROUND_OVERLAY_ROTATION = 0.06
export const GROUND_OVERLAY_ROTATION_STORAGE_KEY = 'tengxian-ground-overlay-rotation'

function getGroundOverlayRotation() {
  if (typeof window === 'undefined') return DEFAULT_GROUND_OVERLAY_ROTATION

  const storedValue = Number.parseFloat(window.localStorage.getItem(GROUND_OVERLAY_ROTATION_STORAGE_KEY))

  return Number.isFinite(storedValue) ? storedValue : DEFAULT_GROUND_OVERLAY_ROTATION
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function walkCoordinates(coords, visitor) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number') {
    visitor(coords)
    return
  }
  coords.forEach((child) => walkCoordinates(child, visitor))
}

function getGeoBounds(geoJson) {
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  }

  geoJson.features?.forEach((feature) => {
    walkCoordinates(feature.geometry?.coordinates, ([lng, lat]) => {
      bounds.minLng = Math.min(bounds.minLng, lng)
      bounds.minLat = Math.min(bounds.minLat, lat)
      bounds.maxLng = Math.max(bounds.maxLng, lng)
      bounds.maxLat = Math.max(bounds.maxLat, lat)
    })
  })

  return bounds
}

function createProjector(bounds) {
  const centerLng = (bounds.minLng + bounds.maxLng) / 2
  const centerLat = (bounds.minLat + bounds.maxLat) / 2
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.000001)
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.000001)
  const scale = MAP_SCALE_SIZE / Math.max(lngSpan, latSpan)

  return {
    center: [centerLng, centerLat],
    scale,
    project([lng, lat], y = 0) {
      return new THREE.Vector3((lng - centerLng) * scale, y, -(lat - centerLat) * scale)
    },
    projectShapePoint([lng, lat]) {
      return new THREE.Vector2((lng - centerLng) * scale, (lat - centerLat) * scale)
    },
  }
}

function getFeaturePolygons(feature) {
  if (feature.geometry?.type === 'Polygon') {
    return [feature.geometry.coordinates]
  }
  if (feature.geometry?.type === 'MultiPolygon') {
    return feature.geometry.coordinates
  }
  return []
}

function getFeatureLabelCoordinate(feature) {
  const lng = Number(feature.properties?.lng)
  const lat = Number(feature.properties?.lat)
  if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat]

  const points = []
  getFeaturePolygons(feature).forEach((rings) => {
    const outerRing = rings[0] ?? []
    outerRing.forEach((point) => {
      if (Number.isFinite(point?.[0]) && Number.isFinite(point?.[1])) {
        points.push(point)
      }
    })
  })

  if (!points.length) return null

  const sum = points.reduce((total, point) => {
    total.lng += point[0]
    total.lat += point[1]
    return total
  }, { lng: 0, lat: 0 })

  return [sum.lng / points.length, sum.lat / points.length]
}

function getExteriorBoundaryRings(geoJson) {
  const pointMap = new Map()
  const segmentMap = new Map()

  const getPointKey = (point) => {
    const key = `${Math.round(point[0] * 100000)},${Math.round(point[1] * 100000)}`
    if (!pointMap.has(key)) pointMap.set(key, point)
    return key
  }

  const addSegment = (start, end) => {
    const startKey = getPointKey(start)
    const endKey = getPointKey(end)
    const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`
    const segment = segmentMap.get(key) ?? { startKey, endKey, count: 0 }
    segment.count += 1
    segmentMap.set(key, segment)
  }

  geoJson.features?.forEach((feature) => {
    getFeaturePolygons(feature).forEach((rings) => {
      const outerRing = rings[0]
      if (!outerRing || outerRing.length < 4) return
      for (let index = 0; index < outerRing.length - 1; index += 1) {
        addSegment(outerRing[index], outerRing[index + 1])
      }
    })
  })

  const adjacency = new Map()
  segmentMap.forEach((segment) => {
    if (segment.count !== 1) return
    const pairs = [
      [segment.startKey, segment.endKey],
      [segment.endKey, segment.startKey],
    ]
    pairs.forEach(([from, to]) => {
      if (!adjacency.has(from)) adjacency.set(from, [])
      adjacency.get(from).push(to)
    })
  })

  const visited = new Set()
  const chains = []

  adjacency.forEach((neighbors, startKey) => {
    neighbors.forEach((nextKey) => {
      const edgeKey = `${startKey}|${nextKey}`
      if (visited.has(edgeKey)) return

      const chain = [startKey, nextKey]
      visited.add(edgeKey)
      visited.add(`${nextKey}|${startKey}`)

      let previousKey = startKey
      let currentKey = nextKey

      while (currentKey !== startKey) {
        const nextCandidates = adjacency.get(currentKey) ?? []
        const availableKey = nextCandidates.find((candidateKey) => (
          candidateKey !== previousKey && !visited.has(`${currentKey}|${candidateKey}`)
        ))

        if (!availableKey) break

        chain.push(availableKey)
        visited.add(`${currentKey}|${availableKey}`)
        visited.add(`${availableKey}|${currentKey}`)
        previousKey = currentKey
        currentKey = availableKey
      }

      if (chain.length > 2) {
        chains.push(chain.map((key) => pointMap.get(key)))
      }
    })
  })

  chains.sort((a, b) => b.length - a.length)
  const longestLength = chains[0]?.length ?? 0

  return chains.filter((chain) => chain.length >= Math.max(80, longestLength * 0.08))
}

function createShapeFromRings(rings, projector) {
  const [outerRing, ...holeRings] = rings
  if (!outerRing || outerRing.length < 4) return null

  const shape = new THREE.Shape(outerRing.map((point) => projector.projectShapePoint(point)))

  holeRings.forEach((ring) => {
    if (ring.length < 4) return
    const hole = new THREE.Path(ring.map((point) => projector.projectShapePoint(point)))
    shape.holes.push(hole)
  })

  return shape
}

function createSeededRandom(seed = 20260708) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function isPointInRing(point, ring) {
  let inside = false
  const [lng, lat] = point

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const [currentLng, currentLat] = ring[index]
    const [previousLng, previousLat] = ring[previousIndex]
    const intersects = ((currentLat > lat) !== (previousLat > lat))
      && (lng < ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat || 1e-12) + currentLng)

    if (intersects) inside = !inside
  }

  return inside
}

function isPointInPolygon(point, rings) {
  const [outerRing, ...holeRings] = rings
  if (!outerRing || !isPointInRing(point, outerRing)) return false

  return !holeRings.some((holeRing) => isPointInRing(point, holeRing))
}

function findFeatureContainingPoint(point, features) {
  return features.find((feature) => (
    getFeaturePolygons(feature).some((rings) => isPointInPolygon(point, rings))
  ))
}

function generateTestGeoMarkers(geoJson, countPerType = TEST_GEO_MARKER_COUNT_PER_TYPE) {
  const random = createSeededRandom()
  const bounds = getGeoBounds(geoJson)
  const markers = []
  const features = geoJson.features ?? []
  const totalCount = TEST_GEO_MARKER_TYPES.length * countPerType
  let attempts = 0

  while (markers.length < totalCount && attempts < totalCount * 500) {
    attempts += 1
    const point = [
      bounds.minLng + (bounds.maxLng - bounds.minLng) * random(),
      bounds.minLat + (bounds.maxLat - bounds.minLat) * random(),
    ]
    const feature = findFeatureContainingPoint(point, features)
    if (!feature) continue

    const typeConfig = TEST_GEO_MARKER_TYPES[Math.floor(markers.length / countPerType)]
    markers.push({
      name: `${typeConfig.type} ${markers.length + 1}`,
      type: typeConfig.type,
      color: typeConfig.color,
      coordinate: point,
      regionName: feature.properties?.name || '',
    })
  }

  return markers
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }
  material?.map?.dispose?.()
  material?.emissiveMap?.dispose?.()
  material?.alphaMap?.dispose?.()
  material?.dispose?.()
}

function createGroundMaterial() {
  // 地面底色用 shader 做径向渐变，贴图只负责叠加科技纹理，不改变底色基调。
  return new THREE.ShaderMaterial({
    uniforms: {
      centerColor: { value: new THREE.Color(0x0f2144) },
      edgeColor: { value: new THREE.Color(0x0d1626) },
      topLightColor: { value: new THREE.Color(0x1d79c9) },
      centerRadius: { value: 340 },
      edgeRadius: { value: 980 },
      topLightRadius: { value: 150 },
      topLightStrength: { value: 0.12 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 centerColor;
      uniform vec3 edgeColor;
      uniform vec3 topLightColor;
      uniform float centerRadius;
      uniform float edgeRadius;
      uniform float topLightRadius;
      uniform float topLightStrength;
      varying vec3 vWorldPosition;

      void main() {
        float distanceToCenter = length(vWorldPosition.xz);
        float fade = smoothstep(centerRadius, edgeRadius, distanceToCenter);
        vec3 color = mix(centerColor, edgeColor, fade);
        float topLight = 1.0 - smoothstep(0.0, topLightRadius, distanceToCenter);
        color += topLightColor * topLight * topLightStrength;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
  })
}

function createGroundTechOverlayMaterial() {
  // 第一层地面科技纹理，可通过右上角贴图 UV 输入框调试旋转角度。
  const texture = new THREE.TextureLoader().load(GROUND_TECH_OVERLAY_URL)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2600 / GROUND_TECH_OVERLAY_SIZE, 2600 / GROUND_TECH_OVERLAY_SIZE)
  texture.center.set(0.5, 0.5)
  texture.rotation = getGroundOverlayRotation()
  texture.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x56b9ff,
    transparent: true,
    opacity: GROUND_TECH_OVERLAY_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  })
}

function createGroundExtraOverlayMaterial() {
  // 第二层地面纹理独立控制透明度和重复密度，便于后续换成其他线框/网格素材。
  const texture = new THREE.TextureLoader().load(GROUND_EXTRA_OVERLAY_URL)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2600 / GROUND_EXTRA_OVERLAY_SIZE, 2600 / GROUND_EXTRA_OVERLAY_SIZE)
  texture.center.set(0.5, 0.5)
  texture.rotation = getGroundOverlayRotation()
  texture.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x7fd7ff,
    transparent: true,
    opacity: GROUND_EXTRA_OVERLAY_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
  })
}

function createModelOrbitRingMaterial() {
  // 圆环贴图使用加法混合，黑底贴图也能自然叠加到深色地面上。
  const texture = new THREE.TextureLoader().load(MODEL_ORBIT_RING_URL)
  texture.colorSpace = THREE.SRGBColorSpace

  return new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x8ed8ff,
    transparent: true,
    opacity: MODEL_ORBIT_RING_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  })
}

function createSpaceLightStreakMaterial() {
  // 用 Canvas 生成柔和粒子点，避免额外图片资源；运动逻辑在 updateSpaceLightStreaks。
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')

  const glow = context.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2,
  )
  glow.addColorStop(0, 'rgba(139, 234, 255, 1)')
  glow.addColorStop(0.22, 'rgba(139, 234, 255, 0.86)')
  glow.addColorStop(0.54, 'rgba(139, 234, 255, 0.22)')
  glow.addColorStop(1, 'rgba(139, 234, 255, 0)')

  context.fillStyle = glow
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  return new THREE.SpriteMaterial({
    map: texture,
    color: 0x8beaff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

function createTopGradientOverlayMaterial() {
  // 顶面渐变膜参考 CSS linear-gradient，但在 Three.js 中用 shader 按地图坐标计算透明度。
  const gradientAngle = THREE.MathUtils.degToRad(-10)

  return new THREE.ShaderMaterial({
    uniforms: {
      highlightColor: { value: new THREE.Color(MAP_TOP_GRADIENT_OVERLAY_COLOR) },
      direction: { value: new THREE.Vector2(Math.cos(gradientAngle), Math.sin(gradientAngle)).normalize() },
      gradientSize: { value: MAP_SCALE_SIZE },
      opacity: { value: MAP_TOP_GRADIENT_OVERLAY_OPACITY },
    },
    vertexShader: `
      varying vec2 vMapPosition;

      void main() {
        vMapPosition = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 highlightColor;
      uniform vec2 direction;
      uniform float gradientSize;
      uniform float opacity;
      varying vec2 vMapPosition;

      void main() {
        float positionOnGradient = dot(vMapPosition, direction) / gradientSize;
        float fade = smoothstep(-0.7, 0.1, positionOnGradient);
        float alpha = (1.0 - fade) * opacity;
        gl_FragColor = vec4(highlightColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  })
}

function createTownLabelSprite(text, scale = TOWN_LABEL_SCALE) {
  // 标签只保留文字投影，不做外发光，保证在小尺寸下清晰但不抢地图边线。
  const pixelRatio = 2
  const paddingX = 8
  const paddingY = 5
  const font = `${TOWN_LABEL_FONT_WEIGHT} ${TOWN_LABEL_FONT_SIZE * pixelRatio}px Arial, "Microsoft YaHei", sans-serif`

  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  measureContext.font = font

  const textWidth = Math.ceil(measureContext.measureText(text).width)
  const canvasWidth = Math.max(1, textWidth + paddingX * 2 * pixelRatio)
  const canvasHeight = Math.ceil((TOWN_LABEL_LINE_HEIGHT + paddingY * 2) * pixelRatio)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const context = canvas.getContext('2d')
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(0, 0, 0, 0.50)'
  context.shadowOffsetX = 0
  context.shadowOffsetY = 1 * pixelRatio
  context.shadowBlur = 1 * pixelRatio

  const gradient = context.createLinearGradient(0, paddingY * pixelRatio, 0, canvasHeight - paddingY * pixelRatio)
  gradient.addColorStop(0, '#f4ffff')
  gradient.addColorStop(1, '#59cfff')
  context.fillStyle = gradient
  context.fillText(text, canvasWidth / 2, canvasHeight / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.name = `town-label-${text}`
  sprite.scale.set(canvasWidth * scale / pixelRatio, canvasHeight * scale / pixelRatio, 1)
  sprite.renderOrder = 32

  return sprite
}

function createGeoMarkerSprite(marker) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  const center = canvas.width / 2

  context.beginPath()
  context.arc(center, center, 17, 0, Math.PI * 2)
  context.fillStyle = `#${marker.color.toString(16).padStart(6, '0')}`
  context.fill()
  context.lineWidth = 5
  context.strokeStyle = '#001f52'
  context.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }))
  sprite.name = `geo-marker-${marker.name}`
  sprite.scale.setScalar(GEO_MARKER_SIZE)
  sprite.renderOrder = 34

  return sprite
}

function createGeoMarkerGroup(markers, projector, mapHeight, markerSprites) {
  const markerGroup = new THREE.Group()
  markerGroup.name = 'geo-coordinate-markers'

  markers.forEach((marker) => {
    const [lng, lat] = marker.coordinate
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

    const sprite = createGeoMarkerSprite(marker)
    sprite.position.copy(projector.project(marker.coordinate, mapHeight + GEO_MARKER_SURFACE_OFFSET))
    sprite.userData.marker = marker
    markerSprites.push(sprite)

    markerGroup.add(sprite)
  })

  return markerGroup
}

function setMaterialDefaults(material) {
  material.userData.defaultColor = material.color.getHex()
  material.userData.defaultEmissive = material.emissive?.getHex?.() ?? 0x000000
  material.userData.defaultEmissiveIntensity = material.emissiveIntensity ?? 0
  material.userData.defaultOpacity = material.opacity
}

export function disposeObject3D(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.()
    if (child.material) disposeMaterial(child.material)
  })
}

export function useThreeScene(containerRef) {
  let scene
  let labelScene
  let camera
  let renderer
  let controls
  let composer
  let animationFrameId = 0
  let cameraTransitionFrameId = 0
  let cameraTransitionPreviousDamping = null
  let resizeObserver
  let mapGroup
  let labelMapGroup
  let floorGroup
  let rotatingOrbitRingGroup
  let spaceLightStreakGroup
  let mapShadowGroup
  let lineMaterials = []
  let geoMarkerSprites = []

  const cleanupCallbacks = []

  function init() {
    const container = containerRef.value
    if (!container) return null

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1626)
    // labelScene 在 bloom 后单独渲染，解决文字被辉光、深度或透明面影响的问题。
    labelScene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 4000)
    camera.position.copy(CAMERA_HOME_POSITION)
    camera.lookAt(CAMERA_HOME_TARGET)

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.82
    container.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.copy(CAMERA_HOME_TARGET)
    controls.minDistance = 54
    controls.maxDistance = 190
    controls.maxPolarAngle = CAMERA_MAX_POLAR_ANGLE
    controls.minPolarAngle = CAMERA_MIN_POLAR_ANGLE
    controls.enableRotate = false
    controls.update()
    bindSpaceRotation()

    mapGroup = new THREE.Group()
    mapGroup.name = 'tengxian-map-root'
    mapGroup.position.y = MAP_MODEL_ELEVATION
    scene.add(mapGroup)

    labelMapGroup = new THREE.Group()
    labelMapGroup.name = 'tengxian-label-root'
    labelMapGroup.position.copy(mapGroup.position)
    labelScene.add(labelMapGroup)

    createLights()
    createTechFloor()
    createComposer(container)
    bindResize(container)
    animate()

    return { scene, camera, renderer, controls, composer, mapGroup }
  }

  function createLights() {
    // 当前模型主要依赖材质自发光和柔光，光源只做轻微体积感补充。
    scene.add(new THREE.AmbientLight(0x9bdcff, 0.72))

    const softTopHemisphere = new THREE.HemisphereLight(0x8ee9ff, 0x071225, 0.18)
    softTopHemisphere.name = 'soft-top-hemisphere-light'
    scene.add(softTopHemisphere)

    const softTopLight = new THREE.SpotLight(0xbcefff, 3.1, 126, Math.PI * 0.2, 0.92, 1.8)
    softTopLight.name = 'soft-top-map-light'
    softTopLight.position.set(0, MAP_MODEL_ELEVATION + 44, 0)
    softTopLight.target.position.set(0, MAP_MODEL_ELEVATION + 1.4, 0)
    softTopLight.layers.set(MAP_MODEL_LIGHT_LAYER)
    scene.add(softTopLight)
    scene.add(softTopLight.target)

    const directionalLight = new THREE.DirectionalLight(0xb6f8ff, 1.85)
    directionalLight.position.set(-24, 48, 38)
    scene.add(directionalLight)

    const sideLight = new THREE.DirectionalLight(0x1dcfff, 0.85)
    sideLight.position.set(42, 20, -34)
    scene.add(sideLight)

    const pointLight = new THREE.PointLight(0x00d9ff, 38, 120)
    pointLight.position.set(-28, 18, 26)
    scene.add(pointLight)
  }

  function createTechFloor() {
    // 地面层级：径向底色 -> 科技贴图一 -> 科技贴图二 -> 点阵。
    floorGroup = new THREE.Group()
    floorGroup.name = 'tech-grid-floor'
    floorGroup.position.y = -0.16

    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      createGroundMaterial(),
    )
    floorPlane.name = 'radial-gradient-floor'
    floorPlane.rotation.x = -Math.PI / 2
    floorPlane.position.y = -0.08
    floorGroup.add(floorPlane)

    const techOverlayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      createGroundTechOverlayMaterial(),
    )
    techOverlayPlane.name = 'ground-tech-overlay'
    techOverlayPlane.rotation.x = -Math.PI / 2
    techOverlayPlane.position.y = -0.055
    techOverlayPlane.renderOrder = 1
    floorGroup.add(techOverlayPlane)

    const extraOverlayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      createGroundExtraOverlayMaterial(),
    )
    extraOverlayPlane.name = 'ground-extra-overlay'
    extraOverlayPlane.rotation.x = -Math.PI / 2
    extraOverlayPlane.position.y = -0.048
    extraOverlayPlane.renderOrder = 2
    floorGroup.add(extraOverlayPlane)

    const dotGeometry = new THREE.BufferGeometry()
    const positions = []
    const size = 2000
    const step = 16

    for (let x = -size / 2; x <= size / 2; x += step) {
      for (let z = -size / 2; z <= size / 2; z += step) {
        positions.push(x, 0.02, z)
      }
    }

    dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const dotMaterial = new THREE.PointsMaterial({
      color: 0x1d79c9,
      size: 0.09,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: false,
    })
    floorGroup.add(new THREE.Points(dotGeometry, dotMaterial))

    scene.add(floorGroup)
    createRotatingOrbitRing()
    createSpaceLightStreaks()
  }

  function createRotatingOrbitRing() {
    rotatingOrbitRingGroup = new THREE.Group()
    rotatingOrbitRingGroup.name = 'rotating-orbit-ring'
    rotatingOrbitRingGroup.position.y = MODEL_ORBIT_RING_HEIGHT

    const ringPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(MODEL_ORBIT_RING_SIZE, MODEL_ORBIT_RING_SIZE),
      createModelOrbitRingMaterial(),
    )
    ringPlane.name = 'rotating-orbit-ring-texture'
    ringPlane.rotation.x = -Math.PI / 2
    ringPlane.renderOrder = 12
    rotatingOrbitRingGroup.add(ringPlane)

    scene.add(rotatingOrbitRingGroup)
  }

  function resetSpaceLightStreak(streak, time = 0, initial = false) {
    // 粒子避开绝对中心，在中近景区域随机出现，再沿 y 轴垂直上升。
    const duration = randomBetween(SPACE_LIGHT_STREAK_MIN_DURATION, SPACE_LIGHT_STREAK_MAX_DURATION)
    const startDelay = initial ? -randomBetween(0, duration) : randomBetween(600, 2600)
    const angle = randomBetween(0, Math.PI * 2)
    const radius = SPACE_LIGHT_STREAK_INNER_RADIUS
      + (SPACE_LIGHT_STREAK_AREA_RADIUS - SPACE_LIGHT_STREAK_INNER_RADIUS) * Math.pow(Math.random(), 1.25)
    const particleSize = randomBetween(SPACE_LIGHT_STREAK_MIN_HEIGHT, SPACE_LIGHT_STREAK_MAX_HEIGHT)

    streak.position.set(
      Math.cos(angle) * radius,
      SPACE_LIGHT_STREAK_BASE_Y,
      Math.sin(angle) * radius,
    )
    streak.scale.setScalar(0.001)
    streak.userData.targetSize = particleSize
    streak.userData.startTime = time + startDelay
    streak.userData.duration = duration
    streak.userData.maxOpacity = randomBetween(SPACE_LIGHT_STREAK_MAX_OPACITY * 0.45, SPACE_LIGHT_STREAK_MAX_OPACITY)
    streak.userData.riseDistance = randomBetween(SPACE_LIGHT_STREAK_MIN_RISE, SPACE_LIGHT_STREAK_MAX_RISE)
    streak.userData.lastFloatOffset = 0
    streak.material.opacity = 0
  }

  function createSpaceLightStreaks() {
    spaceLightStreakGroup = new THREE.Group()
    spaceLightStreakGroup.name = 'space-light-streaks'

    for (let index = 0; index < SPACE_LIGHT_STREAK_COUNT; index += 1) {
      const streak = new THREE.Sprite(createSpaceLightStreakMaterial())
      streak.name = `space-light-streak-${index}`
      streak.renderOrder = 14
      resetSpaceLightStreak(streak, 0, true)
      spaceLightStreakGroup.add(streak)
    }

    scene.add(spaceLightStreakGroup)
  }

  function updateSpaceLightStreaks(time) {
    if (!spaceLightStreakGroup) return

    spaceLightStreakGroup.children.forEach((streak) => {
      const startTime = streak.userData.startTime ?? 0
      const duration = streak.userData.duration ?? SPACE_LIGHT_STREAK_MAX_DURATION

      if (time < startTime) {
        streak.visible = false
        return
      }

      const progress = (time - startTime) / duration
      if (progress >= 1) {
        resetSpaceLightStreak(streak, time)
        streak.visible = false
        return
      }

      const grow = THREE.MathUtils.smoothstep(progress, 0, 0.2)
      const inFade = THREE.MathUtils.smoothstep(progress, 0.04, 0.2)
      const outFade = 1 - THREE.MathUtils.smoothstep(progress, 0.68, 1)
      const fade = inFade * outFade
      const floatOffset = (streak.userData.riseDistance ?? 0) * THREE.MathUtils.smoothstep(progress, 0.18, 1)
      streak.visible = true
      streak.scale.setScalar(Math.max(0.001, (streak.userData.targetSize ?? SPACE_LIGHT_STREAK_MIN_HEIGHT) * grow))
      streak.position.y += (floatOffset - (streak.userData.lastFloatOffset ?? 0))
      streak.userData.lastFloatOffset = floatOffset
      streak.material.opacity = fade * (streak.userData.maxOpacity ?? SPACE_LIGHT_STREAK_MAX_OPACITY)
      // opacity 是已存在的材质 uniform，渲染器会在本帧上传它；标记 needsUpdate 会让 72 个粒子反复检查/重建程序，反而拖慢动画。
    })
  }

  function createComposer(container) {
    composer = new EffectComposer(renderer)
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    composer.setSize(container.clientWidth, container.clientHeight)
    composer.addPass(new RenderPass(scene, camera))

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.34,
      0.32,
      0.48,
    )
    composer.addPass(bloomPass)
  }

  function bindResize(container) {
    const handleResize = () => {
      if (!container.clientWidth || !container.clientHeight) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
      composer.setSize(container.clientWidth, container.clientHeight)
      updateLineMaterialResolution(container)
    }

    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    window.addEventListener('resize', handleResize)
    cleanupCallbacks.push(() => window.removeEventListener('resize', handleResize))
  }

  function bindSpaceRotation() {
    const setRotationEnabled = (enabled) => {
      if (!controls) return
      controls.enableRotate = enabled
      renderer.domElement.dataset.spaceRotation = String(enabled)
      renderer.domElement.style.cursor = enabled
        ? 'grab'
        : renderer.domElement.dataset.mapPointHovered === 'true' ? 'pointer' : 'default'
    }

    const isEditableTarget = (target) => (
      target instanceof HTMLElement
      && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))
    )

    const handleKeyDown = (event) => {
      if (event.code !== 'Space' || isEditableTarget(event.target)) return
      event.preventDefault()
      setRotationEnabled(true)
    }

    const handleKeyUp = (event) => {
      if (event.code !== 'Space') return
      setRotationEnabled(false)
    }

    const handleWindowBlur = () => setRotationEnabled(false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
    cleanupCallbacks.push(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    })
  }

  function animate(time) {
    animationFrameId = window.requestAnimationFrame(animate)
    controls?.update()
    if (rotatingOrbitRingGroup) {
      rotatingOrbitRingGroup.rotation.y = time * MODEL_ORBIT_RING_ROTATION_SPEED
    }
    updateSpaceLightStreaks(time)
    composer?.render()
    if (labelScene) {
      // 先清深度再渲染 labelScene，让镇名永远盖在模型上方且不参与后期辉光。
      const previousAutoClear = renderer.autoClear
      renderer.autoClear = false
      renderer.clearDepth()
      renderer.render(labelScene, camera)
      renderer.autoClear = previousAutoClear
    }
  }

  function clearMap() {
    if (!mapGroup) return
    while (mapGroup.children.length) {
      const child = mapGroup.children[mapGroup.children.length - 1]
      // 不能直接 pop children：那会保留 child.parent 的过期引用，后续重建地图时场景树状态会不一致。
      mapGroup.remove(child)
      disposeObject3D(child)
    }
    while (labelMapGroup?.children.length) {
      const child = labelMapGroup.children[labelMapGroup.children.length - 1]
      labelMapGroup.remove(child)
      disposeObject3D(child)
    }
    geoMarkerSprites = []
    if (mapShadowGroup) {
      scene.remove(mapShadowGroup)
      disposeObject3D(mapShadowGroup)
      mapShadowGroup = null
    }
    lineMaterials = []
  }

  function updateLineMaterialResolution(container) {
    lineMaterials.forEach((material) => {
      material.resolution.set(container.clientWidth, container.clientHeight)
    })
  }

  function createPixelLine(points, options) {
    // Line2 支持屏幕像素级线宽，适合大屏里稳定控制 1.5px/2.5px 边线。
    const container = containerRef.value
    const lineGeometry = new LineGeometry()
    lineGeometry.setPositions(points.flatMap((point) => [point.x, point.y, point.z]))

    const material = new LineMaterial({
      color: options.color,
      linewidth: options.linewidth,
      transparent: true,
      opacity: options.opacity ?? 1,
      depthTest: options.depthTest ?? false,
      depthWrite: false,
      blending: options.blending ?? THREE.NormalBlending,
      resolution: new THREE.Vector2(container?.clientWidth || 1, container?.clientHeight || 1),
    })
    material.fog = false
    material.userData.defaultColor = material.color.getHex()
    material.userData.defaultLinewidth = material.linewidth
    material.userData.defaultOpacity = material.opacity
    lineMaterials.push(material)

    const line = new Line2(lineGeometry, material)
    line.computeLineDistances()
    line.renderOrder = options.renderOrder ?? 0
    line.userData.defaultRenderOrder = line.renderOrder

    return line
  }

  function createOutlineShadow(exteriorRings, projector) {
    // 按整体外轮廓复制多层面并逐层放大透明，形成模型落在地面上的柔阴影。
    if (mapShadowGroup) {
      scene.remove(mapShadowGroup)
      disposeObject3D(mapShadowGroup)
    }

    mapShadowGroup = new THREE.Group()
    mapShadowGroup.name = 'tengxian-outline-blur-shadow'

    exteriorRings.forEach((ring, ringIndex) => {
      if (!ring || ring.length < 4) return

      const closedRing = ring[0] === ring[ring.length - 1] ? ring : [...ring, ring[0]]
      const shape = new THREE.Shape(closedRing.map((point) => projector.projectShapePoint(point)))

      for (let step = 0; step < MAP_OUTLINE_SHADOW_BLUR_STEPS; step += 1) {
        const geometry = new THREE.ShapeGeometry(shape)
        geometry.rotateX(-Math.PI / 2)

        const progress = step / Math.max(MAP_OUTLINE_SHADOW_BLUR_STEPS - 1, 1)
        const scale = 1 + progress * MAP_OUTLINE_SHADOW_BLUR_SCALE
        const opacity = MAP_OUTLINE_SHADOW_OPACITY * (1 - progress) ** 1.75

        const material = new THREE.MeshBasicMaterial({
          color: 0x000814,
          transparent: true,
          opacity,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
          fog: false,
        })

        const shadowMesh = new THREE.Mesh(geometry, material)
        shadowMesh.name = `tengxian-outline-shadow-${ringIndex}-${step}`
        shadowMesh.position.y = MAP_OUTLINE_SHADOW_HEIGHT + step * 0.004
        shadowMesh.scale.set(scale, 1, scale)
        shadowMesh.renderOrder = 2 + step
        mapShadowGroup.add(shadowMesh)
      }
    })

    scene.add(mapShadowGroup)
  }

  function createTopGradientOverlay(exteriorRings, projector, mapHeight) {
    // 只使用整体外轮廓生成一张渐变膜，避免每个镇重复叠加导致地图发灰或消失。
    const overlayGroup = new THREE.Group()
    overlayGroup.name = 'tengxian-top-gradient-overlay'

    exteriorRings.forEach((ring, ringIndex) => {
      if (!ring || ring.length < 4) return

      const closedRing = ring[0] === ring[ring.length - 1] ? ring : [...ring, ring[0]]
      const shape = new THREE.Shape(closedRing.map((point) => projector.projectShapePoint(point)))
      const geometry = new THREE.ShapeGeometry(shape)
      geometry.rotateX(-Math.PI / 2)

      const overlayMesh = new THREE.Mesh(geometry, createTopGradientOverlayMaterial())
      overlayMesh.name = `tengxian-top-gradient-overlay-${ringIndex}`
      overlayMesh.position.y = mapHeight + MAP_TOP_GRADIENT_OVERLAY_OFFSET
      overlayMesh.renderOrder = 18
      overlayGroup.add(overlayMesh)
    })

    return overlayGroup
  }

  function buildGeoJsonMap(geoJson, options = {}) {
    // 主入口：把 GeoJSON 转成挤出模型、边线、标签、阴影和顶面渐变膜。
    clearMap()

    const mapHeight = options.height ?? DEFAULT_MAP_HEIGHT
    const bounds = getGeoBounds(geoJson)
    const projector = createProjector(bounds)
    const regionMeshes = []
    const regionBoundaryLines = []
    const boundaryGroup = new THREE.Group()
    boundaryGroup.name = 'glow-boundaries'

    geoJson.features?.forEach((feature, featureIndex) => {
      const regionName = feature.properties?.name || `区域${featureIndex + 1}`
      const featureGroup = new THREE.Group()
      featureGroup.name = `region-${regionName}`
      featureGroup.userData.region = feature

      getFeaturePolygons(feature).forEach((rings, polygonIndex) => {
        const shape = createShapeFromRings(rings, projector)
        if (!shape) return

        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: mapHeight,
          bevelEnabled: true,
          bevelSize: 0.12,
          bevelThickness: 0.12,
          bevelSegments: 2,
          curveSegments: 4,
        })
        geometry.rotateX(-Math.PI / 2)
        geometry.computeVertexNormals()

        const topMaterial = new THREE.MeshPhongMaterial({
          color: MAP_BASE_COLOR,
          emissive: MAP_TOP_EMISSIVE_COLOR,
          emissiveIntensity: MAP_TOP_EMISSIVE_INTENSITY,
          specular: 0x7edcff,
          shininess: 86,
          transparent: true,
          opacity: 0.74,
          side: THREE.DoubleSide,
          depthWrite: true,
          fog: false,
        })
        const sideMaterial = new THREE.MeshPhongMaterial({
          color: MAP_SIDE_COLOR,
          emissive: MAP_SIDE_EMISSIVE_COLOR,
          emissiveIntensity: MAP_SIDE_EMISSIVE_INTENSITY,
          specular: 0x3ab8ff,
          shininess: 54,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: true,
          fog: false,
        })
        setMaterialDefaults(topMaterial)
        setMaterialDefaults(sideMaterial)

        const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial])
        mesh.name = `${regionName}-${polygonIndex}`
        mesh.userData.region = feature
        mesh.userData.regionName = regionName
        mesh.userData.isMapRegion = true
        mesh.layers.enable(MAP_MODEL_LIGHT_LAYER)
        featureGroup.add(mesh)
        regionMeshes.push(mesh)
      })

      getFeaturePolygons(feature).forEach((rings) => {
        rings.forEach((ring) => {
          if (!ring || ring.length < 2) return
          const topLineHeight = mapHeight + MAP_LINE_SURFACE_OFFSET
          const topPoints = ring.map((point) => projector.project(point, topLineHeight))
          const line = createPixelLine(topPoints, {
            color: MAP_TOP_LINE_COLOR,
            linewidth: 1.5,
            opacity: 1,
            depthTest: false,
            renderOrder: 20,
          })
          line.name = `${regionName}-boundary`
          line.userData.regionName = regionName
          boundaryGroup.add(line)
          regionBoundaryLines.push(line)

          const glow = createPixelLine(topPoints, {
            color: MAP_TOP_LINE_COLOR,
            linewidth: 1.5,
            opacity: 0.22,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            renderOrder: 19,
          })
          glow.name = `${regionName}-boundary-glow`
          glow.userData.regionName = regionName
          glow.userData.isBoundaryGlow = true
          boundaryGroup.add(glow)
          regionBoundaryLines.push(glow)
        })
      })

      const labelCoordinate = getFeatureLabelCoordinate(feature)
      if (labelCoordinate) {
        const label = createTownLabelSprite(
          regionName,
          options.isChild ? TOWN_CHILD_LABEL_SCALE : TOWN_LABEL_SCALE,
        )
        label.position.copy(projector.project(labelCoordinate, mapHeight + TOWN_LABEL_SURFACE_OFFSET))
        label.userData.regionName = regionName
        labelMapGroup?.add(label)
      }

      mapGroup.add(featureGroup)
    })

    const exteriorRings = getExteriorBoundaryRings(geoJson)
    createOutlineShadow(exteriorRings, projector)
    boundaryGroup.add(createTopGradientOverlay(exteriorRings, projector, mapHeight))
    const geoMarkers = options.markers ?? generateTestGeoMarkers(geoJson)
    labelMapGroup?.add(createGeoMarkerGroup(
      geoMarkers,
      projector,
      mapHeight,
      geoMarkerSprites,
    ))

    exteriorRings.forEach((ring, ringIndex) => {
      const closedRing = ring[0] === ring[ring.length - 1] ? ring : [...ring, ring[0]]
      const outerLineHeight = mapHeight + MAP_OUTER_LINE_SURFACE_OFFSET
      const outerOutlinePoints = closedRing.map((point) => projector.project(point, outerLineHeight))
      const outerOutline = createPixelLine(outerOutlinePoints, {
        color: MAP_OUTER_LINE_COLOR,
        linewidth: 2.5,
        opacity: 0.92,
        depthTest: false,
        renderOrder: 22,
      })
      outerOutline.name = `tengxian-top-outer-outline-${ringIndex}`
      boundaryGroup.add(outerOutline)

      const middleLineHeight = mapHeight * MAP_MIDDLE_OUTER_LINE_RATIO
      const middleOutlinePoints = closedRing.map((point) => projector.project(point, middleLineHeight))
      const middleOutline = createPixelLine(middleOutlinePoints, {
        color: MAP_OUTER_LINE_COLOR,
        linewidth: 1.5,
        opacity: 0.05,
        depthTest: false,
        renderOrder: 21,
      })
      middleOutline.name = `tengxian-middle-outer-outline-${ringIndex}`
      boundaryGroup.add(middleOutline)
    })

    mapGroup.add(boundaryGroup)
    mapGroup.rotation.z = -0.05
    labelMapGroup?.rotation.copy(mapGroup.rotation)

    return {
      bounds,
      projector,
      project: projector.project,
      regionMeshes,
      regionBoundaryLines,
      geoMarkers,
      geoMarkerSprites,
      mapHeight,
      mapGroup,
    }
  }

  function focusCamera(position, target = CAMERA_HOME_TARGET) {
    if (!camera || !controls) return
    cancelCameraTransition()
    setCameraView(position, target)
  }

  function setCameraView(position, target = CAMERA_HOME_TARGET) {
    if (!camera || !controls) return
    const previousDamping = controls.enableDamping

    controls.enableDamping = false
    camera.position.copy(position)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    controls.target.copy(target)
    controls.position0?.copy(position)
    controls.target0?.copy(target)
    controls.zoom0 = camera.zoom
    controls.update()
    controls.enableDamping = previousDamping
  }

  function cancelCameraTransition() {
    if (!cameraTransitionFrameId) return
    window.cancelAnimationFrame(cameraTransitionFrameId)
    cameraTransitionFrameId = 0
    if (cameraTransitionPreviousDamping !== null && controls) {
      controls.enableDamping = cameraTransitionPreviousDamping
    }
    cameraTransitionPreviousDamping = null
  }

  function easeOutCubic(value) {
    return 1 - ((1 - value) ** 3)
  }

  function transitionCamera(fromPosition, fromTarget, toPosition, toTarget, duration = CAMERA_INTRO_DURATION) {
    if (!camera || !controls) return
    cancelCameraTransition()

    cameraTransitionPreviousDamping = controls.enableDamping
    const startTime = window.performance.now()
    const startPosition = fromPosition.clone()
    const startTarget = fromTarget.clone()
    const endPosition = toPosition.clone()
    const endTarget = toTarget.clone()
    const currentPosition = new THREE.Vector3()
    const currentTarget = new THREE.Vector3()

    controls.enableDamping = false

    const update = (time) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const easedProgress = easeOutCubic(progress)

      currentPosition.lerpVectors(startPosition, endPosition, easedProgress)
      currentTarget.lerpVectors(startTarget, endTarget, easedProgress)
      camera.position.copy(currentPosition)
      camera.lookAt(currentTarget)
      controls.target.copy(currentTarget)
      controls.update()

      if (progress < 1) {
        cameraTransitionFrameId = window.requestAnimationFrame(update)
        return
      }

      cameraTransitionFrameId = 0
      setCameraView(endPosition, endTarget)
      controls.enableDamping = cameraTransitionPreviousDamping ?? true
      cameraTransitionPreviousDamping = null
    }

    setCameraView(startPosition, startTarget)
    controls.enableDamping = false
    cameraTransitionFrameId = window.requestAnimationFrame(update)
  }

  function focusHome() {
    focusCamera(CAMERA_HOME_POSITION)
  }

  function focusTop() {
    focusCamera(CAMERA_TOP_POSITION, CAMERA_TOP_TARGET)
  }

  function transitionToHome() {
    if (!camera || !controls) return
    transitionCamera(camera.position, controls.target, CAMERA_HOME_POSITION, CAMERA_HOME_TARGET)
  }

  function transitionToTop() {
    if (!camera || !controls) return
    transitionCamera(camera.position, controls.target, CAMERA_TOP_POSITION, CAMERA_TOP_TARGET)
  }

  function playIntroCameraTransition() {
    transitionCamera(CAMERA_INTRO_START_POSITION, CAMERA_INTRO_START_TARGET, CAMERA_HOME_POSITION, CAMERA_HOME_TARGET)
  }

  function dispose() {
    window.cancelAnimationFrame(animationFrameId)
    cancelCameraTransition()
    cleanupCallbacks.forEach((callback) => callback())
    resizeObserver?.disconnect()
    controls?.dispose()
    clearMap()
    if (floorGroup) disposeObject3D(floorGroup)
    if (rotatingOrbitRingGroup) disposeObject3D(rotatingOrbitRingGroup)
    if (spaceLightStreakGroup) disposeObject3D(spaceLightStreakGroup)
    renderer?.dispose()
    composer?.dispose?.()
    renderer?.domElement?.parentNode?.removeChild(renderer.domElement)
  }

  return {
    init,
    buildGeoJsonMap,
    clearMap,
    focusHome,
    focusTop,
    transitionToHome,
    transitionToTop,
    playIntroCameraTransition,
    dispose,
    get scene() {
      return scene
    },
    get camera() {
      return camera
    },
    get renderer() {
      return renderer
    },
    get controls() {
      return controls
    },
    get mapGroup() {
      return mapGroup
    },
  }
}
