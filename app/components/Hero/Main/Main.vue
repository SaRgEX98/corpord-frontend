<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import Input from '~/components/ui/input/Input.vue'
import { UiButton } from '~/components/ui/button'
import { UiSelect } from '~/components/ui/select'
import { UiDatePicker } from '~/components/ui/date-picker'
import { UiTimePicker } from '~/components/ui/time-picker'

interface Address {
  id: number
  value: string
}

const addresses = ref<Address[]>([
  { id: 1, value: '' },
  { id: 2, value: '' },
])
const nextId = ref(3)

const date = ref<Date | null>(null)
const time = ref<string>('09:00')
const passengers = ref(1)
const busType = ref('standard')
const options = reactive({
  wifi: true,
  ac: true,
  seatbelts: true,
})

function addAddress() {
  addresses.value.push({ id: nextId.value++, value: '' })
}

function removeAddress(id: number) {
  addresses.value = addresses.value.filter(a => a.id !== id)
}

function searchRoutes() {
  // Здесь будет вызов API с адресами, датой, временем, пассажирами и типом автобуса
  console.log({
    addresses: addresses.value,
    date: date.value,
    time: time.value,
    passengers: passengers.value,
    busType: busType.value,
    options: { ...options },
  })
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8 items-center w-full px-6 py-16 bg-sky/10">
    <!-- Форма маршрутов -->
    <div class="flex flex-col gap-4 bg-background/70 p-6 rounded-xl shadow-md">
      <h1 class="text-3xl font-bold text-foreground mb-4">Найдите маршрут</h1>

      <!-- Адреса -->
      <div class="flex flex-col gap-2">
        <div v-for="(address, index) in addresses" :key="address.id" class="flex items-center gap-2">
          <Input
              v-model="address.value"
              :placeholder="index === 0 ? 'Откуда' : index === 1 ? 'Куда' : 'Промежуточная точка'"
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

      <!-- Дата и время -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        <UiDatePicker v-model="date" placeholder="Выберите дату" />
        <UiTimePicker v-model="time" placeholder="Выберите время" />
      </div>

      <!-- Пассажиры и тип автобуса -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        <Input type="number" v-model="passengers" min="1" placeholder="Количество пассажиров" />
        <UiSelect v-model="busType" placeholder="Тип автобуса">
          <option value="minibus">Микроавтобус</option>
          <option value="standard">Стандарт</option>
          <option value="vip">VIP</option>
        </UiSelect>
      </div>

      <!-- Дополнительные опции -->
      <div class="flex flex-row gap-4 mt-4">
        <label class="flex items-center gap-1">
          <input type="checkbox" v-model="options.wifi" />
          Wi-Fi
        </label>
        <label class="flex items-center gap-1">
          <input type="checkbox" v-model="options.ac" />
          Кондиционер
        </label>
        <label class="flex items-center gap-1">
          <input type="checkbox" v-model="options.seatbelts" />
          Ремни безопасности
        </label>
      </div>

      <UiButton class="mt-4 w-full" @click="searchRoutes">Найти маршруты</UiButton>
    </div>

    <!-- Иллюстрация / картинка справа -->
    <div class="flex justify-center items-center">
      <NuxtImg class="h-[60vh] mix-blend-difference" src="/light.png" alt="Маршрут" />
    </div>
  </div>
</template>
