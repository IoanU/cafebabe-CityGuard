const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({testDir:'./e2e',use:{baseURL:'http://127.0.0.1:4173/cafebabe-CityGuard/',headless:true},webServer:{command:'node scripts/serve-build.cjs',url:'http://127.0.0.1:4173/cafebabe-CityGuard/',reuseExistingServer:false}});
