import * as THREE from 'three'
import { reactive, ref } from 'vue'

import chargingClusterIcon from '../assets/images/map-points/charging-cluster.png'
import energyStorageIcon from '../assets/images/map-points/energy-storage.png'
import industrialLoadIcon from '../assets/images/map-points/industrial-load.png'
import solarStationIcon from '../assets/images/map-points/solar-station.png'
import windStationIcon from '../assets/images/map-points/wind-station.png'

const ICON_BY_TYPE = {
  光伏电站: solarStationIcon,
  风电场站: windStationIcon,
  储能设施: energyStorageIcon,
  充电桩群: chargingClusterIcon,
  工商业负荷: industrialLoadIcon,
}

const CLICK_RADIUS = 16
const MAX_CLICK_MOVEMENT = 6
const MARKER_EDGE_OFFSET = 4
const MARKER_HOVER_SCALE = 1.35

function getElementLocalSize(element) {
  return {
    width: element.clientWidth || element.width || element.getBoundingClientRect().width,
    height: element.clientHeight || element.height || element.getBoundingClientRect().height,
  }
}

function getElementQuad(element) {
  if (typeof element.getBoxQuads === 'function') {
    const [quad] = element.getBoxQuads()
    if (quad) {
      return {
        topLeft: quad.p1,
        topRight: quad.p2,
        bottomLeft: quad.p4,
      }
    }
  }

  const rect = element.getBoundingClientRect()
  const transformedAncestor = element.closest('.dashboard-stage')
  const transform = window.getComputedStyle(transformedAncestor || element).transform
  const matrix = transform && transform !== 'none' ? new DOMMatrix(transform) : null

  if (matrix && Math.abs(matrix.b) > Math.abs(matrix.a)) {
    if (matrix.b > 0) {
      return {
        topLeft: { x: rect.right, y: rect.top },
        topRight: { x: rect.right, y: rect.bottom },
        bottomLeft: { x: rect.left, y: rect.top },
      }
    }

    return {
      topLeft: { x: rect.left, y: rect.bottom },
      topRight: { x: rect.left, y: rect.top },
      bottomLeft: { x: rect.right, y: rect.bottom },
    }
  }

  if (matrix && matrix.a < 0 && matrix.d < 0) {
    return {
      topLeft: { x: rect.right, y: rect.bottom },
      topRight: { x: rect.left, y: rect.bottom },
      bottomLeft: { x: rect.right, y: rect.top },
    }
  }

  return {
    topLeft: { x: rect.left, y: rect.top },
    topRight: { x: rect.right, y: rect.top },
    bottomLeft: { x: rect.left, y: rect.bottom },
  }
}

function getViewportPointInElement(element, clientX, clientY) {
  const { width, height } = getElementLocalSize(element)
  const { topLeft, topRight, bottomLeft } = getElementQuad(element)
  const xAxis = {
    x: topRight.x - topLeft.x,
    y: topRight.y - topLeft.y,
  }
  const yAxis = {
    x: bottomLeft.x - topLeft.x,
    y: bottomLeft.y - topLeft.y,
  }
  const determinant = xAxis.x * yAxis.y - xAxis.y * yAxis.x

  if (Math.abs(determinant) < 0.0001) {
    const rect = element.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (width / rect.width),
      y: (clientY - rect.top) * (height / rect.height),
    }
  }

  const deltaX = clientX - topLeft.x
  const deltaY = clientY - topLeft.y
  const localRatioX = (deltaX * yAxis.y - deltaY * yAxis.x) / determinant
  const localRatioY = (xAxis.x * deltaY - xAxis.y * deltaX) / determinant

  return {
    x: localRatioX * width,
    y: localRatioY * height,
  }
}

function toHexColor(color) {
  return `#${Number(color ?? 0x1db4ff).toString(16).padStart(6, '0')}`
}

export function useMapIconPoints({ getCamera, getRenderer }) {
  const markerSprites = ref([])
  const selectedPoint = reactive({
    visible: false,
    marker: null,
    object: null,
    iconUrl: '',
    accent: '#1db4ff',
    x: 0,
    y: 0,
  })

  const projectedPosition = new THREE.Vector3()
  const worldPosition = new THREE.Vector3()
  let visibleMarkerTypes = null
  let domElement
  let hoveredSprite = null
  let suppressedHoverSprite = null
  let pointerDownPosition = null

  function setSpriteHovered(sprite, isHovered) {
    if (!sprite) return
    const defaultScale = sprite.userData.defaultHoverScale ?? sprite.scale.x
    sprite.userData.defaultHoverScale = defaultScale
    sprite.scale.setScalar(defaultScale * (isHovered ? MARKER_HOVER_SCALE : 1))
  }

  function clearHoveredSprite() {
    setSpriteHovered(hoveredSprite, false)
    hoveredSprite = null
  }

  function updateHoveredSprite(sprite) {
    if (hoveredSprite === sprite) return
    clearHoveredSprite()
    hoveredSprite = sprite
    setSpriteHovered(hoveredSprite, true)
  }

  function setPointHoverState(isHovered) {
    if (!domElement) return
    domElement.dataset.mapPointHovered = String(isHovered)
    domElement.style.cursor = domElement.dataset.spaceRotation === 'true'
      ? 'grab'
      : isHovered ? 'pointer' : 'default'
  }

  function projectMarkerToScreen(sprite) {
    const camera = getCamera()
    const renderer = getRenderer()
    if (!camera || !renderer || !sprite) return null

    sprite.getWorldPosition(worldPosition)
    projectedPosition.copy(worldPosition).project(camera)
    if (projectedPosition.z < -1 || projectedPosition.z > 1) return null

    const { width, height } = getElementLocalSize(renderer.domElement)
    return {
      x: (projectedPosition.x * 0.5 + 0.5) * width,
      y: (-projectedPosition.y * 0.5 + 0.5) * height,
      anchorY: (-projectedPosition.y * 0.5 + 0.5) * height - MARKER_EDGE_OFFSET,
    }
  }

  function setMarkerSprites(sprites) {
    clearHoveredSprite()
    suppressedHoverSprite = null
    markerSprites.value = sprites || []
    markerSprites.value.forEach((sprite) => sprite.updateWorldMatrix(true, false))
    applyVisibleMarkerTypes()
    close()
  }

  function applyVisibleMarkerTypes() {
    markerSprites.value.forEach((sprite) => {
      const type = sprite.userData.marker?.type
      sprite.visible = !visibleMarkerTypes || visibleMarkerTypes.has(type)
    })

    if (
      selectedPoint.visible
      && selectedPoint.marker?.type
      && visibleMarkerTypes
      && !visibleMarkerTypes.has(selectedPoint.marker.type)
    ) {
      close()
    }
  }

  function setVisibleMarkerTypes(types) {
    visibleMarkerTypes = types ? new Set(types) : null
    applyVisibleMarkerTypes()
    clearHoveredSprite()
    suppressedHoverSprite = null
    setPointHoverState(false)
  }

  function close() {
    selectedPoint.visible = false
    selectedPoint.marker = null
    selectedPoint.object = null
    selectedPoint.iconUrl = ''
  }

  function findMarkerAt(event) {
    const renderer = getRenderer()
    if (!renderer) return null

    const pointer = getViewportPointInElement(renderer.domElement, event.clientX, event.clientY)
    let nearest = null
    let nearestDistance = CLICK_RADIUS

    markerSprites.value.forEach((sprite) => {
      if (!sprite.visible) return

      const screen = projectMarkerToScreen(sprite)
      if (!screen) return

      const distance = Math.hypot(screen.x - pointer.x, screen.y - pointer.y)
      if (distance <= nearestDistance) {
        nearest = { sprite, screen }
        nearestDistance = distance
      }
    })

    return nearest
  }

  function select(hit) {
    if (selectedPoint.visible && selectedPoint.object === hit.sprite) {
      close()
      return
    }

    const marker = hit.sprite.userData.marker
    selectedPoint.visible = true
    selectedPoint.marker = marker
    selectedPoint.object = hit.sprite
    selectedPoint.iconUrl = ICON_BY_TYPE[marker.type] || ''
    selectedPoint.accent = toHexColor(marker.color)
    selectedPoint.x = hit.screen.x
    selectedPoint.y = hit.screen.anchorY
  }

  function handlePointerDown(event) {
    pointerDownPosition = { x: event.clientX, y: event.clientY }
  }

  function handlePointerMove(event) {
    const hit = findMarkerAt(event)
    setPointHoverState(Boolean(hit))

    if (hit?.sprite === suppressedHoverSprite) {
      clearHoveredSprite()
      return
    }

    suppressedHoverSprite = null
    updateHoveredSprite(hit?.sprite || null)
  }

  function handlePointerLeave() {
    clearHoveredSprite()
    suppressedHoverSprite = null
    setPointHoverState(false)
  }

  function handlePointerUp(event) {
    if (!pointerDownPosition) return

    const movement = Math.hypot(
      event.clientX - pointerDownPosition.x,
      event.clientY - pointerDownPosition.y,
    )
    pointerDownPosition = null
    if (movement > MAX_CLICK_MOVEMENT) return

    const hit = findMarkerAt(event)
    if (hit) {
      clearHoveredSprite()
      suppressedHoverSprite = hit.sprite
      select(hit)
    }
    else close()
  }

  function updateScreenPosition() {
    if (!selectedPoint.visible || !selectedPoint.object) return

    const screen = projectMarkerToScreen(selectedPoint.object)
    if (!screen) {
      selectedPoint.visible = false
      return
    }

    selectedPoint.x = screen.x
    selectedPoint.y = screen.anchorY
  }

  function bind() {
    domElement = getRenderer()?.domElement
    if (!domElement) return

    domElement.style.cursor = 'default'
    domElement.addEventListener('pointerdown', handlePointerDown)
    domElement.addEventListener('pointermove', handlePointerMove)
    domElement.addEventListener('pointerleave', handlePointerLeave)
    domElement.addEventListener('pointerup', handlePointerUp)
  }

  function dispose() {
    if (!domElement) return
    clearHoveredSprite()
    suppressedHoverSprite = null
    setPointHoverState(false)
    domElement.removeEventListener('pointerdown', handlePointerDown)
    domElement.removeEventListener('pointermove', handlePointerMove)
    domElement.removeEventListener('pointerleave', handlePointerLeave)
    domElement.removeEventListener('pointerup', handlePointerUp)
  }

  return {
    selectedPoint,
    setMarkerSprites,
    setVisibleMarkerTypes,
    updateScreenPosition,
    close,
    bind,
    dispose,
  }
}
