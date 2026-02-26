const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { findSlackPaths, isMac } = require('./paths');
const BACKUP_DIR = path.join(__dirname, 'backups');
async function unpatch() {
    console.log('sleek | rolling back');
    try {
        const paths = await findSlackPaths();
        const backups = [
            { backup: path.join(BACKUP_DIR, 'app.asar.bak'), target: paths.mainAsar },
            { backup: path.join(BACKUP_DIR, 'app-arm64.asar.bak'), target: paths.armAsar },
        ];
        let restored = 0;
        for (const { backup, target } of backups) {
            if (await fs.pathExists(backup)) {
                console.log(`sleek | restoring ${path.basename(target)}`);
                await fs.copy(backup, target, { overwrite: true });
                restored++;
            }}
        if (restored === 0) {
            console.error('sleek | no backups found in scripts/backups/, nothing to restore');
            return;
        }
        if (isMac) {
            console.log('sleek | resigning');
            try { execSync(`xattr -cr "${paths.root}"`); } catch (_) {}
            try {
                execSync(`codesign --force --deep --sign - "${paths.root}"`, { stdio: 'inherit' });
            } catch (_) {
                console.warn('sleek | codesign failed - might still work');
            }
        }
        console.log(`sleek | rolled back ${restored} asar. slack should be back to stock`);
    } catch (err) {
        console.error('sleek | rollback failed:', err.message);
    }
}

unpatch();
