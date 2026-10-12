const {defineConfig}=require('@playwright/test');
const base=require('./playwright.config');
process.env.SKILL_TEST_FOLDER='08_screen_reader';
module.exports=defineConfig(base,{
 testMatch:'07-skill.spec.js',
 outputDir:'test-results/08-skill-sync',
 projects:[{name:'08-sync-chromium',use:{browserName:'chromium'}},{name:'08-sync-webkit',use:{browserName:'webkit'}}]
});
