const {defineConfig}=require('@playwright/test');
const base=require('./playwright.config');
module.exports=defineConfig({...base,testDir:'./wide-tests',timeout:45000,globalTimeout:5*60*1000,workers:2,maxFailures:3,retries:0,
 outputDir:'wide-test-results',reporter:[['line'],['json',{outputFile:'wide-test-report.json'}]],
 use:{...base.use,viewport:{width:1920,height:1080},actionTimeout:5000,navigationTimeout:10000,trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
});
