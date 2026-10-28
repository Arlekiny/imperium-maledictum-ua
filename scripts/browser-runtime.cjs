/* Optional browser QA; build and unit tests do not need Playwright. */
const path=require('node:path');
const {chromium}=require(process.env.IM_PLAYWRIGHT_MODULE || 'playwright');
exports.launchBrowser=()=>chromium.launch({headless:true,...(process.env.IM_BROWSER_EXECUTABLE?{executablePath:process.env.IM_BROWSER_EXECUTABLE}:{})});
exports.root=path.resolve(__dirname,'..');
