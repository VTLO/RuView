#!/usr/bin/env node
/**
 * Build script: transpile Live X-ray WebView and MAT dashboard to self-contained HTML strings.
 * Outputs:
 * - src/assets/webview/liveXray.generated.ts
 * - src/assets/webview/matDashboard.generated.ts
 * These are imported by native WebView components.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const terser = require('terser');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(PROJECT_ROOT, 'src');
const ASSETS = path.join(SRC, 'assets', 'webview');
const XRAY_DIR = path.join(SRC, 'screens', 'LiveScreen', 'xray');

// Ensure output directory
if (!fs.existsSync(ASSETS)) {
  fs.mkdirSync(ASSETS, { recursive: true });
}

/**
 * Transpile TypeScript → ES5 CommonJS using transpileModule.
 * This is lightweight and doesn't require full compilation.
 */
function transpile(tsCode) {
  const result = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
  });
  return result.outputText;
}

/**
 * Build the Live X-ray WebView bundle.
 */
function buildLiveXray() {
  console.log('Building Live X-ray WebView...');

  // Read three.cjs inline (already built)
  const threePath = path.join(PROJECT_ROOT, 'node_modules', 'three', 'build', 'three.cjs');
  if (!fs.existsSync(threePath)) {
    throw new Error(`three.cjs not found at ${threePath}. Run npm install.`);
  }
  const threeCode = fs.readFileSync(threePath, 'utf8');

  // Read xray modules
  const materialsTs = fs.readFileSync(path.join(XRAY_DIR, 'materials.ts'), 'utf8');
  const entityTs = fs.readFileSync(path.join(XRAY_DIR, 'entity.ts'), 'utf8');
  const sceneTs = fs.readFileSync(path.join(XRAY_DIR, 'scene.ts'), 'utf8');

  // Transpile xray modules (they import three, so we fake it)
  const materialsCjs = transpile(materialsTs);
  const entityCjs = transpile(entityTs);
  const sceneCjs = transpile(sceneTs);

  // Create a simple module registry that fakes require() for our modules
  const moduleRegistry = `
const modules = {};
function define(name, factory) { modules[name] = factory(); }
function require(name) {
  if (modules[name]) return modules[name];
  if (name === 'three') return THREE;
  if (name === './materials') return modules['./materials'] || {};
  if (name === './entity') return modules['./entity'] || {};
  throw new Error('Module not found: ' + name);
}
`;

  // Bundle the modules
  const bundledCode = `
${threeCode}

${moduleRegistry}

define('./materials', function() {
  ${materialsCjs}
  return { xrayUniforms, xrayMaterial };
});

define('./entity', function() {
  ${entityCjs}
  return { createEntity, updateEntity, computeTargets, BASE_POSE, BONES };
});

define('./scene', function() {
  ${sceneCjs}
  return { mountXrayScene };
});

const { mountXrayScene } = require('./scene');

// Webview entry: listen for frames from React Native, push HUD updates back.
window.__xrayMount = function(container) {
  let dispose = null;
  const getRender = function() {
    if (window.__xrayLatestFrame) return window.__xrayLatestFrame;
    return null;
  };

  function post(type, data) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }
  }

  dispose = mountXrayScene(container, {
    getFrame: getRender,
    onReady: () => post('READY', {}),
    onFps: (fps) => post('FPS_TICK', { fps }),
  });

  window.__xrayDispose = dispose;
  window.__xraySetFrame = function(frame) {
    window.__xrayLatestFrame = frame;
  };
};

// Bridge: accept messages from React Native
window.addEventListener('message', function(e) {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.type === 'FRAME_UPDATE') {
      window.__xraySetFrame(msg.payload);
    }
  } catch (err) {
    // Silently ignore parse errors
  }
});
`;

  // Optionally minify (terser is optional)
  let finalCode = bundledCode;
  try {
    const minified = terser.minify(bundledCode);
    if (!minified.error) {
      finalCode = minified.code;
      console.log(`  Minified: ${bundledCode.length} → ${finalCode.length} bytes`);
    }
  } catch (err) {
    console.log('  Minification skipped (terser not available or error)');
  }

  // Read the HTML template (or create a minimal one)
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VTLO_EyesOfGod Live</title>
  <style>
    body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    #xray-container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="xray-container"></div>
  <script>
${finalCode}
    // Mount on load
    window.__xrayMount(document.getElementById('xray-container'));
  </script>
</body>
</html>`;

  // Write generated TS file
  const tsOut = path.join(ASSETS, 'liveXray.generated.ts');
  const tsContent = `// AUTO-GENERATED: do not edit\nexport const LIVE_XRAY_HTML = ${JSON.stringify(htmlTemplate)};`;
  fs.writeFileSync(tsOut, tsContent);
  console.log(`  → ${path.relative(PROJECT_ROOT, tsOut)}`);
}

/**
 * Build the MAT Dashboard bundle.
 */
function buildMatDashboard() {
  console.log('Building MAT Dashboard...');

  // Read mat-dashboard.html
  const matPath = path.join(SRC, 'screens', 'MATScreen', 'mat-dashboard.html');
  if (!fs.existsSync(matPath)) {
    console.warn(`  mat-dashboard.html not found, creating minimal stub`);
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>MAT Dashboard</title>
  <style>
    body { margin: 0; padding: 20px; background: #000; color: #fff; font-family: monospace; }
  </style>
</head>
<body>
  <h1>VTLO_EyesOfGod MAT</h1>
  <p>Mass Casualty Assessment Tool</p>
</body>
</html>`;
    fs.writeFileSync(matPath, htmlContent);
  }

  const htmlContent = fs.readFileSync(matPath, 'utf8');
  const tsOut = path.join(ASSETS, 'matDashboard.generated.ts');
  const tsContent = `// AUTO-GENERATED: do not edit\nexport const MAT_DASHBOARD_HTML = ${JSON.stringify(htmlContent)};`;
  fs.writeFileSync(tsOut, tsContent);
  console.log(`  → ${path.relative(PROJECT_ROOT, tsOut)}`);
}

// Main
try {
  buildLiveXray();
  buildMatDashboard();
  console.log('✓ WebView bundles built successfully');
  process.exit(0);
} catch (err) {
  console.error('✗ Bundle build failed:', err.message);
  process.exit(1);
}
