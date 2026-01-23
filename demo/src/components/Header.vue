<template>
  <header class="header">
    <div class="header-content">
      <div class="logo">
        <h1 class="text-gradient">🚀 JTCSV Converter</h1>
        <p class="subtitle">Interactive JSON ↔ CSV converter with real-time preview</p>
      </div>
      <div class="header-stats">
        <div class="stat">
          <span class="stat-label">Version</span>
          <span class="stat-value">2.1.0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Status</span>
          <span class="stat-value success">Online</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
// No script needed for now
</script>

<style scoped>
.header {
  padding: 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 30px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.logo h1 {
  font-size: 2.2rem;
  margin-bottom: 5px;
}

.subtitle {
  color: #94a3b8;
  font-size: 1rem;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  min-width: 100px;
}

.stat-label {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #3b82f6;
}

.stat-value.success {
  color: #10b981;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .header-stats {
    width: 100%;
    justify-content: center;
  }
}
</style>