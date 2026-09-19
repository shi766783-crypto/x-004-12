import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { ensureSpacesMigrated } from './services/db'
import './assets/styles/base.css'

// 先完成多空间数据迁移（旧数据归入默认空间），再初始化各 store
ensureSpacesMigrated()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
