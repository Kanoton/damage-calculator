const {defineConfig,devices}=require('@playwright/test');
const base=require('./playwright.config');
module.exports=defineConfig({...base,testDir:'./mobile-tests',timeout:30000,globalTimeout:5*60*1000,workers:2,maxFailures:3,retries:0,
 outputDir:'mobile-test-results',reporter:[['line'],['json',{outputFile:'mobile-test-report.json'}]],
 use:{...base.use,actionTimeout:5000,navigationTimeout:10000,trace:'retain-on-failure'},
 projects:[{name:'android-chromium',use:{...devices['Pixel 5'],browserName:'chromium'}},{name:'iphone-webkit',use:{...devices['iPhone 13'],browserName:'webkit'}}],
});
