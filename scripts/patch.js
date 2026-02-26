const asar = require('asar');
const fs = require('fs-extra');
const path = require('path');
const { flipFuses, FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');
const { findSlackPaths, getUserDataPath, isMac } = require('./paths');

const BACKUP_DIR = path.join(__dirname, 'backups');
const TEMP_DIR = path.join(__dirname, 'temp_asar');
const SRC_DIR = path.join(__dirname, '../src');

const RENDERER_MODULES = [
    'renderer/core/bus.js',
    'renderer/core/settings.js',
    'renderer/core/plugin.js',
    'renderer/core/theme.js',
    'renderer/core/mapping.js',
    'renderer/ui/styles.js',
    'renderer/ui/tabs/general.js',
    'renderer/ui/tabs/plugins.js',
    'renderer/ui/tabs/themes.js',
    'renderer/ui/tabs/quick-css.js',
    'renderer/ui/inject.js',
    'renderer/core/api.js',
    'renderer/index.js',
];

function buildCore() {
    const parts = RENDERER_MODULES.map(mod => {
        const filePath = path.join(SRC_DIR, mod);
        const content = fs.readFileSync(filePath, 'utf8');
        return `// --- ${mod} ---\n${content}`;
    });

    return `(function() {\n    if (window.sleek && window.sleek.active) return;\n    console.log('sleek | loaded');\n\n${parts.join('\n\n')}\n\n})();\n`;
}

async function patchAsar(asarPath, label, userDataPath) {
    const backupPath = path.join(BACKUP_DIR, label + '.bak');
    console.log(`sleek | working on ${label}...`);

    if (!(await fs.pathExists(backupPath))) {
        await fs.copy(asarPath, backupPath);
    }

    if (await fs.pathExists(TEMP_DIR)) {
        await fs.remove(TEMP_DIR);
    }
    asar.extractAll(asarPath, TEMP_DIR);
    
    const leftovers = ['sleek-main.js', 'sleek-preload.js', 'sleek-core.js'];
    for (const file of leftovers) {
        const p = path.join(TEMP_DIR, file);
        if (await fs.pathExists(p)) {
            console.log(`sleek | removing residual file: ${file}`);
            await fs.remove(p);
        }
    }

    const indexJsPath = path.join(TEMP_DIR, 'index.js');
    const bootBundlePath = path.join(TEMP_DIR, 'dist/boot.bundle.cjs');
    
    let targetPath = null;
    if (await fs.pathExists(indexJsPath)) targetPath = indexJsPath;
    else if (await fs.pathExists(bootBundlePath)) targetPath = bootBundlePath;

    if (targetPath) {
        console.log(`sleek | targeting ${path.basename(targetPath)}`);
        const targetDir = path.dirname(targetPath);
        const destPath = path.join(targetDir, 'sleek-main.js');
        
        await fs.copy(path.join(SRC_DIR, 'main/index.js'), destPath);
        
        const coreDestPath = path.join(targetDir, 'sleek-core.js');
        console.log(`sleek | building core ${coreDestPath} (${RENDERER_MODULES.length} modules)`);
        await fs.writeFile(coreDestPath, buildCore());
        
        let content = await fs.readFile(targetPath, 'utf8');
        content = content.replace(/\/\* ---sleek \*\/[\s\S]*\/\* sleek--- \*\/\n?/g, '');
        content = content.replace(/require\(.*sleek-(main|preload|core)\.js.*\);\n?/g, '');
        
        const hook = `/* ---sleek */\nrequire('./sleek-main.js');\n/* sleek--- */\n`;
        await fs.writeFile(targetPath, hook + content);
        console.log(`sleek | hooked ${path.basename(targetPath)}`);
    }

    const nativePreloadPath = path.join(TEMP_DIR, 'dist/preload.bundle.js');
    if (await fs.pathExists(nativePreloadPath)) {
        console.log(`sleek | targeting native preload.bundle.js`);
        
        const targetDir = path.dirname(nativePreloadPath);
        await fs.writeFile(path.join(targetDir, 'sleek-core.js'), buildCore());

        const preloadCode = await fs.readFile(path.join(SRC_DIR, 'preload/index.js'), 'utf8');
        let content = await fs.readFile(nativePreloadPath, 'utf8');
        
        content = content.replace(/\/\* ---sleek \*\/[\s\S]*\/\* sleek--- \*\/\n?/g, '');
        content = content.replace(/require\(.*sleek-(main|preload|core)\.js.*\);\n?/g, '');
        
        const hook = `/* ---sleek */\n(function() {\n${preloadCode}\n})();\n/* sleek--- */\n`;
        await fs.writeFile(nativePreloadPath, hook + content);
        console.log(`sleek | injected bridge into preload.bundle.js`);
    }

    // kill csp
    const files = await fs.readdir(TEMP_DIR, { recursive: true });
    for (const file of files) {
        if (file.endsWith('.html')) {
            const filePath = path.join(TEMP_DIR, file);
            let html = await fs.readFile(filePath, 'utf8');
            if (html.includes('Content-Security-Policy')) {
                console.log(`sleek | killing csp meta in ${file}`);
                html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '');
                await fs.writeFile(filePath, html);
            }
        }
    }

    // sync plugins and themes
    for (const dir of ['plugins', 'themes']) {
        const projectPath = path.join(__dirname, '..', dir);
        const userPath = path.join(userDataPath, dir);
        if (await fs.pathExists(projectPath)) {
            console.log(`sleek | syncing ${dir} to ${userPath}`);
            await fs.ensureDir(userPath);
            await fs.copy(projectPath, userPath);
        }
    }

    await asar.createPackage(TEMP_DIR, asarPath);
}

async function patch() {
    console.log('sleek | starting patch');
    try {
        const paths = await findSlackPaths();
        const userDataPath = getUserDataPath();
        
        await fs.ensureDir(BACKUP_DIR);
        
        console.log(`sleek | target: ${paths.executable}`);
        console.log('sleek | disabling integrity checks');
        
        await flipFuses(paths.executable, {
            version: FuseVersion.V1,
            resetAdHocDarwinSignature: isMac, 
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
            [FuseV1Options.RunAsNode]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: false, 
        });

        await patchAsar(paths.mainAsar, 'app.asar', userDataPath);
        if (await fs.pathExists(paths.armAsar)) {
            await patchAsar(paths.armAsar, 'app-arm64.asar', userDataPath);
        }

        if (isMac) {
            console.log('sleek | resigning (if you see this on linux, how have you managed this??)');
            try { execSync(`xattr -cr "${paths.root}"`); } catch (e) {}
            try {
                execSync(`codesign --force --deep --sign - "${paths.root}"`, { stdio: 'inherit' });
            } catch (e) {
                console.warn('sleek | codesign failed - might still work depending on your settings');
            }
        }

        console.log('sleek | done');
        if (await fs.pathExists(TEMP_DIR)) await fs.remove(TEMP_DIR);
    } catch (error) {
        console.error('sleek | patch failed:', error.message);
    }
}

patch();
