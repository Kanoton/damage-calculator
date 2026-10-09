const { defineConfig } = require('@playwright/test');
const base = require('./playwright.config');
module.exports = defineConfig({
 ...base, testDir:'./pair-tests', timeout:45000, globalTimeout:12*60*1000,
 workers:2, maxFailures:3, retries:0, expect:{timeout:2000},
 outputDir:'pair-test-results',
 reporter:[['line'],['json',{outputFile:'pair-test-report.json'}]],
 use:{...base.use,actionTimeout:4000,navigationTimeout:10000,trace:'retain-on-failure'},
});
