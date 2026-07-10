<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import tengxianGeoJson from '../../assets/map/tengxian.json'
import { useMapIconPoints } from '../../composables/useMapIconPoints.js'
import { useMapInteraction } from '../../composables/useMapInteraction.js'
import { useThreeScene } from '../../composables/useThreeScene.js'

const props = defineProps({
  visibleMarkerTypes: {
    type: Array,
    default: () => [],
  },
})

const sceneContainer = ref(null)

let overlayFrameId = 0
let rootGeoMarkers = null

const threeScene = useThreeScene(sceneContainer)

const interaction = useMapInteraction({
  getCamera: () => threeScene.camera,
  getRenderer: () => threeScene.renderer,
  getControls: () => threeScene.controls,
  onDrilldown: (geoJson, feature) => {
    const regionName = feature?.properties?.name || ''
    const regionMarkers = (rootGeoMarkers || []).filter((marker) => marker.regionName === regionName)
    buildMap(geoJson, regionMarkers)
  },
  onDrillup: () => buildMap(tengxianGeoJson, rootGeoMarkers),
})

const iconPoints = useMapIconPoints({
  getCamera: () => threeScene.camera,
  getRenderer: () => threeScene.renderer,
})

watch(
  () => props.visibleMarkerTypes,
  (types) => iconPoints.setVisibleMarkerTypes(types),
  { deep: true },
)

function updateOverlayPositions() {
  iconPoints.updateScreenPosition()
  overlayFrameId = window.requestAnimationFrame(updateOverlayPositions)
}

function buildMap(geoJson, markers, options = {}) {
  if (!threeScene.scene) return

  const result = threeScene.buildGeoJsonMap(geoJson, {
    markers,
    isChild: geoJson !== tengxianGeoJson,
  })
  interaction.setRegionMeshes(result.regionMeshes, result.regionBoundaryLines)
  iconPoints.setMarkerSprites(result.geoMarkerSprites)

  if (geoJson === tengxianGeoJson && rootGeoMarkers === null) {
    rootGeoMarkers = result.geoMarkers
  }

  if (options.focusHome !== false) {
    threeScene.focusHome()
  }
}

function returnToParentMap() {
  const didDrillUp = interaction.drillUp()
  if (didDrillUp) iconPoints.close()
}

function focusTiltView() {
  iconPoints.close()
  threeScene.focusHome()
}

function focusTopView() {
  iconPoints.close()
  threeScene.focusTop()
}

defineExpose({
  returnToParentMap,
  focusTiltView,
  focusTopView,
})

onMounted(() => {
  threeScene.init()
  buildMap(tengxianGeoJson, undefined, { focusHome: false })
  threeScene.playIntroCameraTransition()
  iconPoints.setVisibleMarkerTypes(props.visibleMarkerTypes)
  interaction.bind()
  iconPoints.bind()
  updateOverlayPositions()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(overlayFrameId)
  interaction.dispose()
  iconPoints.dispose()
  threeScene.dispose()
})
</script>

<template>
  <section class="map-scene">
    <div ref="sceneContainer" class="map-scene__canvas" />

    <div
      v-if="iconPoints.selectedPoint.visible"
      class="map-scene__point-detail"
      :style="{
        left: `${iconPoints.selectedPoint.x}px`,
        top: `${iconPoints.selectedPoint.y}px`,
        '--point-accent': iconPoints.selectedPoint.accent,
      }"
    >
      <div class="map-scene__point-card" />
      <img
        class="map-scene__point-icon"
        :src="iconPoints.selectedPoint.iconUrl"
        alt=""
      >
    </div>
  </section>
</template>

<style lang="scss" scoped>
.map-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: #d8fbff;
  background:
    radial-gradient(circle at 50% 52%, rgba(15, 33, 68, 0.9) 0%, rgba(13, 22, 38, 0.92) 58%),
    #0d1626;
}

.map-scene__canvas {
  position: absolute;
  inset: 0;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.map-scene__point-detail {
  position: absolute;
  z-index: 5;
  display: grid;
  justify-items: center;
  gap: 7px;
  transform: translate(-50%, -100%);
  pointer-events: none;
}

.map-scene__point-card {
  position: relative;
  width: 300px;
  height: 96px;
  border: 1px solid color-mix(in srgb, var(--point-accent) 72%, #dffcff 28%);
  background:
    linear-gradient(100deg, color-mix(in srgb, var(--point-accent) 12%, transparent), transparent 70%),
    rgba(3, 18, 38, 0.88);
  box-shadow:
    inset 3px 0 0 color-mix(in srgb, var(--point-accent) 86%, transparent),
    0 8px 24px rgba(0, 8, 24, 0.38);

  &::after {
    position: absolute;
    bottom: -6px;
    left: 50%;
    width: 10px;
    height: 10px;
    border-right: 1px solid var(--point-accent);
    border-bottom: 1px solid var(--point-accent);
    background: #06182e;
    content: '';
    transform: translateX(-50%) rotate(45deg);
  }
}

.map-scene__point-icon {
  display: block;
  width: 32px;
  height: 42.67px;
  object-fit: contain;
}
</style>
