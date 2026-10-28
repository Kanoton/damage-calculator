const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classify,parseDiff}=require('./ci-test-scope.cjs');
const chip={status:'M',path:'08_screen_reader/js/screen-reader-chip-shape-references.js'};
test('reviewed chip additions and their own tests may use the focused suite',()=>{
 assert.equal(classify([chip,{status:'A',path:'tests/fixtures/screen-reader/chip-grid-kaisei-20261022.json'},{status:'M',path:'tests/08-chip-reader.spec.js'},{status:'M',path:'docs/development-handoff.md'}]),'chips');
});
test('runtime, shared data, shared assets, broad tests and infrastructure require full regression',()=>{
 for(const path of ['08_screen_reader/js/screen-reader-vision.js','08_screen_reader/js/calculator.js','csv/chip_list.csv','images/UT_Relic/UT_Relic_50025.png','tests/08-screen-reader.spec.js','package.json','.github/workflows/08-screen-reader-smoke.yml','scripts/ci-test-scope.cjs','unknown.txt'])assert.equal(classify([chip,{status:'M',path}]),'full',path);
});
test('deletion, rename, empty diff, docs-only, push and manual events fail closed',()=>{
 for(const status of ['D','R100','T'])assert.equal(classify([{...chip,status}]),'full');
 assert.equal(classify([]),'full');assert.equal(classify([{status:'M',path:'docs/readme.md'}]),'full');
 for(const event of ['push','workflow_dispatch','local'])assert.equal(classify([chip],event),'full');
});
test('NUL-delimited paths are preserved and malformed records fail',()=>{
 assert.deepEqual(parseDiff('M\0a name with spaces\0A\0line\nbreak\0'),[{status:'M',path:'a name with spaces'},{status:'A',path:'line\nbreak'}]);
 assert.throws(()=>parseDiff('M\0'));assert.deepEqual(parseDiff(''),[]);
});
