import * as THREE from 'three'
import { ref } from 'vue'

const childMapLoaders = import.meta.glob('../assets/map/tengxian/*.json')

// hover 只做轻微增强；如果觉得悬浮过强，优先调这里的颜色、透明度和线宽。
const HOVER_MAP_COLOR = 0x2f8ee0
const HOVER_MAP_EMISSIVE = 0x0a68a8
const HOVER_MAP_EMISSIVE_INTENSITY = 0.42
const HOVER_MAP_OPACITY = 0.84
const HOVER_BOUNDARY_COLOR = 0x2fc7ff
const HOVER_BOUNDARY_GLOW_COLOR = 0x1db4ff
const HOVER_BOUNDARY_LINEWIDTH = 1.8
const HOVER_BOUNDARY_GLOW_LINEWIDTH = 2.2
const HOVER_BOUNDARY_GLOW_OPACITY = 0.28

function getPointer(event, domElement) {
  const rect = domElement.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
  }
}

function setMeshState(mesh, isActive) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  materials.forEach((material) => {
    if (!material) return

    if (isActive) {
      material.color.set(HOVER_MAP_COLOR)
      material.emissive?.set(HOVER_MAP_EMISSIVE)
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = HOVER_MAP_EMISSIVE_INTENSITY
      }
      material.opacity = HOVER_MAP_OPACITY
    } else {
      material.color.set(material.userData.defaultColor ?? 0x1d79c9)
      material.emissive?.set(material.userData.defaultEmissive ?? 0x041b36)
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = material.userData.defaultEmissiveIntensity ?? 0
      }
      material.opacity = material.userData.defaultOpacity ?? 0.76
    }

    // color、emissive 和 opacity 都是现有 uniform，直接赋值即可；needsUpdate 会触发昂贵的材质程序检查。
  })
}

function setLineState(line, isActive) {
  const material = line.material
  if (!material) return

  if (isActive) {
    material.color.set(line.userData.isBoundaryGlow ? HOVER_BOUNDARY_GLOW_COLOR : HOVER_BOUNDARY_COLOR)
    material.linewidth = line.userData.isBoundaryGlow ? HOVER_BOUNDARY_GLOW_LINEWIDTH : HOVER_BOUNDARY_LINEWIDTH
    material.opacity = line.userData.isBoundaryGlow ? HOVER_BOUNDARY_GLOW_OPACITY : 1
    // 激活边线提高 renderOrder，避免被相邻镇的普通边线压住。
    line.renderOrder = line.userData.isBoundaryGlow ? 40 : 41
  } else {
    material.color.set(material.userData.defaultColor ?? 0x0085c8)
    material.linewidth = material.userData.defaultLinewidth ?? 1.5
    material.opacity = material.userData.defaultOpacity ?? 1
    line.renderOrder = line.userData.defaultRenderOrder ?? 0
  }

  // LineMaterial 的颜色、线宽和透明度无需重新编译 shader，悬浮时只更新数值即可。
}

export function useMapInteraction({
  getCamera,
  getRenderer,
  getControls,
  onDrilldown,
  onDrillup,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const regionMeshes = ref([])
  const regionBoundaryLines = ref([])
  const hoveredRegion = ref(null)
  const activeRegionName = ref('')
  const drilldownMessage = ref('')
  const breadcrumbs = ref([{ name: '藤县', level: 'county' }])

  let domElement
  // 动态 import 虽然通常很快，但连续双击不同区域时仍可能乱序返回；序号确保只采用最后一次请求的结果。
  let drilldownRequestId = 0

  function setRegionMeshes(meshes, boundaryLines = []) {
    regionMeshes.value = meshes || []
    regionBoundaryLines.value = boundaryLines || []
    activeRegionName.value = ''
    hoveredRegion.value = null
  }

  function setRegionActive(regionName, active) {
    regionMeshes.value.forEach((mesh) => {
      if (mesh.userData.regionName === regionName) {
        setMeshState(mesh, active)
      }
    })
    regionBoundaryLines.value.forEach((line) => {
      if (line.userData.regionName === regionName) {
        setLineState(line, active)
      }
    })
  }

  function pickRegion(event) {
    const camera = getCamera()
    const renderer = getRenderer()
    if (!camera || !renderer || !regionMeshes.value.length) return null

    const point = getPointer(event, renderer.domElement)
    pointer.set(point.x, point.y)
    raycaster.setFromCamera(pointer, camera)

    const intersects = raycaster.intersectObjects(regionMeshes.value, false)
    const mesh = intersects.find((item) => item.object.userData.isMapRegion)?.object

    return mesh
      ? {
          mesh,
          region: mesh.userData.region,
          regionName: mesh.userData.regionName,
        }
      : null
  }

  function handlePointerMove(event) {
    const hit = pickRegion(event)

    if (!hit) {
      if (activeRegionName.value) setRegionActive(activeRegionName.value, false)
      activeRegionName.value = ''
      hoveredRegion.value = null
      return
    }

    if (activeRegionName.value !== hit.regionName) {
      if (activeRegionName.value) setRegionActive(activeRegionName.value, false)
      activeRegionName.value = hit.regionName
      setRegionActive(hit.regionName, true)
    }

    hoveredRegion.value = hit.region
  }

  function handlePointerLeave() {
    if (activeRegionName.value) setRegionActive(activeRegionName.value, false)
    activeRegionName.value = ''
    hoveredRegion.value = null
  }

  async function loadChildGeoJson(regionName) {
    // 下钻接口预留：后续把乡镇级 JSON 放到 src/assets/map/tengxian/<镇名>.json 即可。
    const path = `../assets/map/tengxian/${regionName}.json`
    const loader = childMapLoaders[path]
    if (!loader) return null
    const module = await loader()
    return module.default || module
  }

  async function handleDoubleClick(event) {
    const hit = pickRegion(event)

    if (breadcrumbs.value.length > 1) {
      if (!hit) {
        breadcrumbs.value = breadcrumbs.value.slice(0, 1)
        drilldownMessage.value = ''
        onDrillup?.()
      }
      return
    }

    if (!hit) return

    drilldownMessage.value = `正在尝试加载 ${hit.regionName} 乡镇级 GeoJSON...`
    const requestId = ++drilldownRequestId
    let childGeoJson

    try {
      childGeoJson = await loadChildGeoJson(hit.regionName)
    } catch {
      if (requestId === drilldownRequestId) {
        drilldownMessage.value = `${hit.regionName} 乡镇级 GeoJSON 加载失败，请检查文件格式。`
      }
      return
    }

    if (requestId !== drilldownRequestId) return

    if (!childGeoJson) {
      drilldownMessage.value = `${hit.regionName} 乡镇级 GeoJSON 尚未添加，已预留下钻接口。`
      return
    }

    breadcrumbs.value = [
      { name: '藤县', level: 'county' },
      { name: hit.regionName, level: 'town', feature: hit.region },
    ]
    drilldownMessage.value = ''
    onDrilldown?.(childGeoJson, hit.region)
  }

  function goBreadcrumb(index) {
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
    drilldownMessage.value = ''
  }

  function drillUp() {
    if (breadcrumbs.value.length <= 1) return false

    drilldownRequestId += 1
    breadcrumbs.value = breadcrumbs.value.slice(0, 1)
    drilldownMessage.value = ''
    if (activeRegionName.value) setRegionActive(activeRegionName.value, false)
    activeRegionName.value = ''
    hoveredRegion.value = null
    onDrillup?.()

    return true
  }

  function bind() {
    const renderer = getRenderer()
    domElement = renderer?.domElement
    if (!domElement) return

    domElement.addEventListener('pointermove', handlePointerMove)
    domElement.addEventListener('pointerleave', handlePointerLeave)
    domElement.addEventListener('dblclick', handleDoubleClick)
  }

  function dispose() {
    if (!domElement) return
    domElement.removeEventListener('pointermove', handlePointerMove)
    domElement.removeEventListener('pointerleave', handlePointerLeave)
    domElement.removeEventListener('dblclick', handleDoubleClick)
  }

  function resetView() {
    getControls()?.reset?.()
  }

  return {
    breadcrumbs,
    hoveredRegion,
    drilldownMessage,
    setRegionMeshes,
    goBreadcrumb,
    drillUp,
    resetView,
    bind,
    dispose,
  }
}
