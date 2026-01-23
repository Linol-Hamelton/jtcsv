import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// Remove loading overlay when app is ready
const loadingOverlay = document.querySelector('.loading-overlay')
if (loadingOverlay) {
  loadingOverlay.style.opacity = '0'
  setTimeout(() => {
    loadingOverlay.style.display = 'none'
  }, 300)
}

createApp(App).mount('#app')