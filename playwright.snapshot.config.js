const {defineConfig}=require('@playwright/test');
const base=require('./playwright.config');
module.exports=defineConfig({...base,testDir:'./snapshot-tests',workers:2,retries:0,timeout:30000,
 outputDir:'snapshot-test-results',reporter:[['line'],['json',{outputFile:'snapshot-test-report.json'}]],
 use:{...base.use,trace:'retain-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
});
