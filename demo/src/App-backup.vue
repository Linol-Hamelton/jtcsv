<template>
  <div class="app-container">
    <Header />
    <main class="main-content">
      <div class="container">
        <h2 class="section-title">🚀 JTCSV Web Demo</h2>
        <p class="section-description">Interactive JSON ↔ CSV converter with real-time preview, security features, and performance analytics</p>
        
        <div class="demo-placeholder">
          <div class="placeholder-content">
            <i class="fas fa-code fa-3x"></i>
            <h3>Demo Interface Coming Soon</h3>
            <p>The full interactive demo is being implemented...</p>
            <div class="features-list">
              <div class="feature">
                <i class="fas fa-bolt"></i>
                <span>Fast-Path Engine Optimization</span>
              </div>
              <div class="feature">
                <i class="fas fa-shield-alt"></i>
                <span>CSV Injection Protection</span>
              </div>
              <div class="feature">
                <i class="fas fa-stream"></i>
                <span>NDJSON Streaming Support</span>
              </div>
              <div class="feature">
                <i class="fas fa-plug"></i>
                <span>Plugin System Integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 20px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-title {
  font-size: 1.8rem;
  margin-bottom: 10px;
  color: #e2e8f0;
}

.section-description {
  color: #94a3b8;
  margin-bottom: 30px;
  font-size: 1.1rem;
  line-height: 1.6;
}

.demo-placeholder {
  background: rgba(255, 255, 255, 0.05);
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  margin-top: 40px;
}

.placeholder-content {
  max-width: 600px;
  margin: 0 auto;
}

.placeholder-content i {
  color: #3b82f6;
  margin-bottom: 20px;
}

.placeholder-content h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: #e2e8f0;
}

.placeholder-content p {
  color: #94a3b8;
  margin-bottom: 30px;
}

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 30px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.feature i {
  color: #3b82f6;
  font-size: 1.2rem;
}

.feature span {
  color: #e2e8f0;
  font-weight: 500;
}

@media (max-width: 768px) {
  .features-list {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .section-description {
    font-size: 1rem;
  }
}
</style>
