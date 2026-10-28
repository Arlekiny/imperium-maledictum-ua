/* Run from any folder: node audit.cjs. Does not require a browser or a server. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const L=require('./src/logic.js');
const {CATALOG}=require('./src/catalog.js');
const raw=Object.fromEntries(fs.readdirSync(path.join(__dirname,'src/data')).filter(file=>file.endsWith('.json')).map(file=>[file.slice(0,-5),JSON.parse(fs.readFileSync(path.join(__dirname,'src/data',file),'utf8'))]));
const report=L.validate(raw,CATALOG);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'source-manifest.json'),'utf8'));
report.sourceHashes=manifest.files.map(file=>{
  const bytes=fs.readFileSync(path.join(__dirname,'src/data',file.name));
  const actual=crypto.createHash('sha256').update(bytes).digest('hex');
  return {file:file.name,bytes:bytes.length,sha256:actual,match:actual===file.sha256 && bytes.length===file.bytes};
});
report.limitations=['Checks compare with the pinned fan repository, not with published rulebooks.','This audit covers data and source hashes. See VERIFICATION.md and browser-checks.json for original, browser, XP and delivery checks.','Source-label aliases affect filtering only; original values and source order are preserved.'];
fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'evidence/data-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({tableCount:report.tableCount,rowCount:report.rowCount,profileCount:report.profileCount,errors:report.errors,warnings:report.warnings,sourceFiles:report.sourceHashes.length,hashesPassed:report.sourceHashes.every(file=>file.match)},null,2));
if(report.errors.length || report.sourceHashes.some(file=>!file.match))process.exitCode=1;
