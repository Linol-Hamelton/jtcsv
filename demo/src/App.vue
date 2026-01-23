<template>
  <div class="app-container">
    <Header />
    <main class="main-content">
      <div class="container">
        <h2 class="section-title">🚀 JTCSV Web Demo</h2>
        <p class="section-description">Interactive JSON ↔ CSV converter with real-time preview, security features, and performance analytics</p>
        
        <!-- Replace placeholder with real converter -->
        <Converter />

        <!-- Additional features section -->
        <div class="features-section">
          <h3 class="features-title"><i class="fas fa-star"></i> Key Features</h3>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-bolt"></i>
              </div>
              <h4>Fast-Path Engine</h4>
              <p>Optimized parsing with automatic strategy selection for maximum performance</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-shield-alt"></i>
              </div>
              <h4>Security First</h4>
              <p>Built-in CSV injection protection to prevent formula execution attacks</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-stream"></i>
              </div>
              <h4>NDJSON Support</h4>
              <p>Streaming processing for large JSON files with Newline Delimited JSON</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <i class="fas fa-plug"></i>
              </div>
              <h4>Plugin System</h4>
              <p>Extensible architecture with middleware and hooks for custom functionality</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Converter from './components/Converter.vue'
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

/* Features section */
.features-section {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.features-title {
  font-size: 1.5rem;
  color: #e2e8f0;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 25px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
  
.feature-icon {
  width: 60px;
  height: 60px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
  
.feature-icon i {
  font-size: 1.8rem;
  color: #3b82f6;
}

.feature-card h4 {
  font-size: 1.2rem;
  color: #e2e8f0;
  margin-bottom: 10px;
}

.feature-card p {
  color: #94a3b8;
  line-height: 1.6;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .section-description {
    font-size: 1rem;
  }

  .feature-card {
    padding: 20px;
  }
}
</style>

