const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const nodeModulesDir = path.join(rootDir, 'node_modules');

console.log('[fix-cmake] Starting CMake and Ninja fix for Windows/OneDrive...');

// Recursively find and patch all CMakeLists.txt and remove .cxx cache folders
function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.cxx' || entry.name === '.ninja_deps' || entry.name === '.ninja_log') {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`[fix-cmake] Removed stale cache: ${path.relative(rootDir, fullPath)}`);
        } catch (e) {
          console.warn(`[fix-cmake] Warning: Could not remove ${fullPath}: ${e.message}`);
        }
      } else {
        processDirectory(fullPath);
      }
    } else if (entry.name === 'CMakeLists.txt') {
      patchCMakeFile(fullPath);
    }
  }
}

function patchCMakeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Remove CONFIGURE_DEPENDS (triggers continuous Ninja re-evaluation on Windows)
    if (content.includes('CONFIGURE_DEPENDS')) {
      content = content.replace(/\s+CONFIGURE_DEPENDS/g, '');
      modified = true;
    }

    // 2. Suppress CMake regeneration in Ninja to prevent "manifest 'build.ninja' still dirty" loops
    if (!content.includes('CMAKE_SUPPRESS_REGENERATION')) {
      if (content.includes('cmake_minimum_required')) {
        content = content.replace(
          /cmake_minimum_required\s*\([^)]+\)/,
          '$&\nset(CMAKE_SUPPRESS_REGENERATION TRUE)'
        );
      } else {
        content = 'set(CMAKE_SUPPRESS_REGENERATION TRUE)\n' + content;
      }
      modified = true;
    }

    // 3. Remove -flto=thin (causes Clang crash on Windows NDK 27 during Release builds)
    if (content.includes('-flto=thin')) {
      content = content.replace(/-flto=thin/g, '');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[fix-cmake] Patched: ${path.relative(rootDir, filePath)}`);
    }
  } catch (e) {
    console.warn(`[fix-cmake] Failed to patch ${filePath}: ${e.message}`);
  }
}

// Clean project-level android .cxx caches
const projectCxxDirs = [
  path.join(rootDir, 'android', '.cxx'),
  path.join(rootDir, 'android', 'app', '.cxx'),
  path.join(rootDir, 'android', 'app', 'build'),
  path.join(rootDir, 'android', 'build'),
];

projectCxxDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[fix-cmake] Cleaned project build cache: ${path.relative(rootDir, dir)}`);
    } catch (e) {
      console.warn(`[fix-cmake] Warning: Could not clean ${dir}: ${e.message}`);
    }
  }
});

// Process all node_modules
if (fs.existsSync(nodeModulesDir)) {
  processDirectory(nodeModulesDir);
}

console.log('[fix-cmake] CMake and Ninja patching completed successfully.');

