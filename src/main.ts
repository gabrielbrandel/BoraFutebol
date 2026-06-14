import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import type { ToastMessageOptions } from 'primevue/toast'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css'
import 'leaflet/dist/leaflet.css'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode',
      cssLayer: false
    }
  },
  ripple: true
})
app.use(ToastService)

const toastApi = app.config.globalProperties.$toast as {
  add: (message: ToastMessageOptions) => void
  remove: (message: ToastMessageOptions) => void
  removeGroup: (group: string) => void
  removeAllGroups: () => void
}
const toastAdd = toastApi.add.bind(toastApi)
const toastLifeBySeverity: Record<string, number> = {
  success: 2800,
  info: 2800,
  warn: 3500,
  error: 4500
}
toastApi.add = (message) => {
  const severity = message.severity ?? 'info'
  toastAdd({
    ...message,
    closable: message.closable ?? false,
    styleClass: ['app-toast', message.styleClass].filter(Boolean).join(' '),
    life: message.life ?? toastLifeBySeverity[severity] ?? 3000
  })
}

app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

app.mount('#app')
