const fs = require('fs');
const path = require('path');
const os = require('os');

const filesToPatch = [
  'node_modules/react-native-reanimated/android/CMakeLists.txt',
  'node_modules/react-native-worklets/android/CMakeLists.txt',
  'node_modules/react-native-screens/android/src/main/jni/CMakeLists.txt',
  'node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
  'node_modules/react-native-maps/android/src/main/jni/CMakeLists.txt',
];

const rootDir = path.resolve(__dirname, '..');

filesToPatch.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Remove CONFIGURE_DEPENDS to prevent file-watching issues on Windows
    if (content.includes('CONFIGURE_DEPENDS')) {
      content = content.replace(/\s+CONFIGURE_DEPENDS/g, '');
      modified = true;
    }

    // Add CMAKE_SUPPRESS_REGENERATION to prevent unnecessary regeneration
    if (!content.includes('CMAKE_SUPPRESS_REGENERATION')) {
      content = content.replace(
        /cmake_minimum_required\(VERSION\s+[0-9.]+\)/,
        '$&\nset(CMAKE_SUPPRESS_REGENERATION TRUE)'
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`[fix-cmake] Patched ${relPath}`);
    }
  }
});

// Clean any stale .cxx build caches in node_modules that cause permission issues
// on Windows/OneDrive. These get regenerated fresh on each build.
const cxxDirsToClean = [
  'node_modules/react-native-reanimated/android/.cxx',
  'node_modules/react-native-worklets/android/.cxx',
  'node_modules/react-native-screens/android/src/main/jni/.cxx',
  'node_modules/react-native-safe-area-context/android/src/main/jni/.cxx',
  'node_modules/react-native-maps/android/src/main/jni/.cxx',
];

cxxDirsToClean.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`[fix-cmake] Cleaned stale cache: ${relPath}`);
    } catch (e) {
      console.warn(`[fix-cmake] Warning: Could not clean ${relPath}: ${e.message}`);
    }
  }
});

console.log('[fix-cmake] Done.');
