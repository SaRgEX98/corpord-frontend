<script lang="ts">
let protocolRegistered = false;
</script>
<script setup lang="ts">
import type { Map as LibreMap } from 'maplibre-gl';
const props = defineProps<{ points: {name: string; latitude: number | null; longitude: number | null}[] }>();
const config = useRuntimeConfig();
const host = ref<HTMLElement>();
const activated = ref(false);
const failure = ref('');
let map: LibreMap | undefined;
let themeObserver: MutationObserver | undefined;
let generation = 0;
const dark = ref(false);
const style = computed(() => dark.value && config.public.mapDarkStyleUrl ? config.public.mapDarkStyleUrl : config.public.mapStyleUrl);
onMounted(() => {
  dark.value = document.documentElement.classList.contains('dark');
  themeObserver = new MutationObserver(() => { dark.value = document.documentElement.classList.contains('dark'); });
  themeObserver.observe(document.documentElement, {attributes:true,attributeFilter:['class']});
});
watch(style, value => { if (value && map) map.setStyle(value); });
const points = computed(() => props.points.filter(point => point.latitude != null && point.longitude != null));
async function open() {
  const run = ++generation;
  activated.value = true; failure.value = '';
  await nextTick();
  try {
    const [maplibre, {Protocol}] = await Promise.all([import('maplibre-gl'), import('pmtiles')]);
    await import('maplibre-gl/dist/maplibre-gl.css');
    if (!host.value || run !== generation || !points.value.length) return;
    // Shared protocol supports multiple maps without one unmount breaking another.
    if (!protocolRegistered) { maplibre.addProtocol('pmtiles', new Protocol().tile); protocolRegistered = true; }
    const currentMap = new maplibre.Map({container:host.value,style:style.value,center:[points.value[0]!.longitude!,points.value[0]!.latitude!],zoom:9,attributionControl:{compact:false}});
    map = currentMap;
    currentMap.addControl(new maplibre.NavigationControl());
    currentMap.on('error', () => { failure.value = 'Карта временно недоступна. Названия и координаты доступны ниже.'; });
    for (const point of points.value) new maplibre.Marker().setLngLat([point.longitude!,point.latitude!]).setPopup(new maplibre.Popup().setText(point.name)).addTo(currentMap);
    if (points.value.length > 1) {
      const bounds = new maplibre.LngLatBounds();
      for (const point of points.value) bounds.extend([point.longitude!,point.latitude!]);
      currentMap.fitBounds(bounds,{padding:40,maxZoom:13});
    }
  } catch { failure.value = 'Карта временно недоступна. Названия и координаты доступны ниже.'; }
}
function cleanup() { generation++; map?.remove(); map = undefined; activated.value = false; }
watch(() => JSON.stringify(props.points.map(point => [point.name,point.latitude,point.longitude])), cleanup);
onBeforeUnmount(() => { cleanup(); themeObserver?.disconnect(); });
</script>
<template>
  <div class="mt-4">
    <button v-if="!activated && config.public.mapStyleUrl && points.length" type="button" class="btn btn-secondary" @click="open">Показать карту</button>
    <p v-if="!config.public.mapStyleUrl" class="form-hint">Карта пока не подключена. Названия остановок и расписание доступны без неё.</p>
    <p v-else-if="!points.length" class="form-hint">Координаты выбранных мест пока не указаны.</p>
    <p v-if="failure" role="status" class="form-hint">{{ failure }}</p>
    <div v-if="activated" ref="host" class="mt-3 h-72 w-full rounded-xl" aria-label="Карта выбранных мест" />
    <ul v-if="points.length" class="mt-2 text-xs text-muted-foreground"><li v-for="point in points" :key="point.name">{{ point.name }}: {{ point.latitude }}, {{ point.longitude }}</li></ul>
    <p v-if="activated" class="form-hint mt-1">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="text-link">участники OpenStreetMap</a>. Показаны точки остановок; дорожная траектория не рассчитана.</p>
  </div>
</template>
