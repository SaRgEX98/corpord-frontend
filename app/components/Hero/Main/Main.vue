<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { CalendarIcon, MapPinIcon, UsersIcon, BusIcon } from 'lucide-vue-next'
import { getLocalTimeZone, today } from '@internationalized/date'
import { cn } from '~/lib/utils'
import {OrderSchema} from "~/features/order/ui/order.schema";

interface Address {
  id: number
  value: string
}

const addresses = ref<Address[]>([
  { id: 1, value: '' },
  { id: 2, value: '' },
])
const nextId = ref(3)

const start = today(getLocalTimeZone())
const end = start.add({ days: 7 })
const dateRange = ref({ start, end })

const time = ref<string>('09:00')
const passengers = ref(1)
const busType = ref('standard')
const busTypes = [
  { label: 'Микроавтобус', value: 'minibus' },
  { label: 'Стандарт', value: 'standard' },
  { label: 'VIP', value: 'vip' },
]

const options = reactive({
  wifi: true,
  ac: true,
  seatbelts: true,
})

const isFormValid = OrderSchema

function addAddress() {
  addresses.value.push({ id: nextId.value++, value: '' })
}

function removeAddress(id: number) {
  addresses.value = addresses.value.filter(a => a.id !== id)
}

function searchRoutes() {
  if (!isFormValid['~validate']) return
  console.log({
    addresses: addresses.value.map(a => a.value),
    date: dateRange.value,
    time: time.value,
    passengers: passengers.value,
    busType: busType.value,
    options: { ...options },
  })
  // TODO: вызвать API для поиска маршрутов
}
</script>

<template>
  <div={]>
  <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8 items-center w-full px-6 py-16 bg-sky/10">
    <!-- Левая часть: форма маршрутов -->
    <div class="flex flex-col gap-4 bg-background/70 p-6 rounded-xl shadow-md">
      <h1 class="text-3xl font-bold text-foreground mb-4">Найдите маршрут</h1>

      <!-- Адреса -->
      <div class="flex flex-col gap-2">
        <div
            v-for="(address, index) in addresses"
            :key="address.id"
            class="flex items-center gap-2 relative"
        >
          <UiInput
              v-model="address.value"
              :placeholder="index === 0 ? 'Откуда' : index === 1 ? 'Куда' : 'Промежуточная точка'"
              icon="MapPinIcon"
          />
          <UiButton
              v-if="index > 1"
              variant="destructive"
              size="sm"
              @click="removeAddress(address.id)"
          >
            ×
          </UiButton>
        </div>
        <UiButton variant="outline" size="sm" @click="addAddress">+ Добавить адрес</UiButton>
      </div>

      <!-- Дата поездки -->
      <UiPopover>
        <UiPopoverTrigger as-child>
          <UiButton
              variant="outline"
              :class="cn('w-full justify-start text-left font-normal', !dateRange.start && 'text-muted-foreground')"
          >
            <CalendarIcon class="mr-2 h-4 w-4"/>
            <div class="flex flex-row justify-between items-center w-1/3">
              <span>{{ dateRange.start }}</span>
              <span>-</span>
              <span>{{ dateRange.end }}</span>
            </div>
          </UiButton>
        </UiPopoverTrigger>
        <UiPopoverContent class="w-auto p-0">
          <UiRangeCalendar v-model="dateRange" :number-of-months="2" disable-days-outside-current-view/>
        </UiPopoverContent>
      </UiPopover>

      <!-- Время, пассажиры, тип автобуса -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <UiInput type="time" v-model="time" icon="ClockIcon" />
        <UiInput type="number" v-model="passengers" min="1" placeholder="Пассажиры" icon="UsersIcon" />
        <UiSelect v-model="busType">
          <UiSelectTrigger>
            <UiSelectValue placeholder="Тип автобуса"/>
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem v-for="item in busTypes" :key="item.value" :value="item.value">
              {{ item.label }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <!-- Дополнительные опции -->
      <div class="flex flex-row flex-wrap gap-4 mt-4">
        <UiLabel class="flex items-center gap-1">
          <UiCheckbox v-model="options.wifi"/>
          Wi-Fi
        </UiLabel>
        <UiLabel class="flex items-center gap-1">
          <UiCheckbox v-model="options.ac"/>
          Кондиционер
        </UiLabel>
        <UiLabel class="flex items-center gap-1">
          <UiCheckbox v-model="options.seatbelts"/>
          Ремни безопасности
        </UiLabel>
      </div>

      <!-- Кнопка поиска -->
      <UiButton
          class="mt-4 w-full"
          @click="searchRoutes"
          :disabled="!isFormValid"
      >
        Найти маршруты
      </UiButton>
    </div>

    <!-- Правая часть: иллюстрация -->
    <div class="flex justify-center items-center">
      <NuxtImg class="h-[60vh] mix-blend-difference" src="/light.png" alt="Маршрут" />
    </div>
  </div>
</template>
