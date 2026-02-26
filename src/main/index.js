const Module = require('module');
const path = require('path');
const fs = require('fs');

// i originally made this mistake and never doing that agian
if (global.__sleek_loaded) return;
global.__sleek_loaded = true;

console.log('sleek | main hook');

class SettingsManager {
    constructor(app) {
        this.path = path.join(app.getPath('userData'), 'sleek_settings.json');
        this.data = {};
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.path)) {
                this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
            }
        } catch (e) {
            console.error('sleek | couldnt load settings:', e);
        }
    }
    save() {
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 4));
        } catch (e) {
            console.error('sleek | couldnt save settings:', e);
        }
    }
    get(key, defaultValue) {
        return this.data[key] !== undefined ? this.data[key] : defaultValue;
    }
    set(key, value) {
        this.data[key] = value;
        this.save();
    }
}

const CORE_PATHS = [
    path.join(__dirname, 'sleek-core.js'),
    path.join(__dirname, 'dist', 'sleek-core.js'),
    path.join(__dirname, '../', 'sleek-core.js')
];

let CORE_CODE = '';
for (const p of CORE_PATHS) {
    try {
        if (fs.existsSync(p)) {
            CORE_CODE = fs.readFileSync(p, 'utf8');
            console.log('sleek | loaded core code from:', p);
            break;
        }
    } catch (e) {}
}

if (!CORE_CODE) {
    console.error('sleek | failed to load core code from any location');
}

const STRIP_HEADERS = [
    'content-security-policy',
    'x-content-security-policy',
    'content-security-policy-report-only'
];

function stripCSP(details, callback) {
    const headers = details.responseHeaders;
    Object.keys(headers).forEach(header => {
        if (STRIP_HEADERS.includes(header.toLowerCase())) {
            delete headers[header];
        }
    });
    callback({ cancel: false, responseHeaders: headers });
}

function patchWebPreferences(options) {
    if (!options) options = {};
    if (!options.webPreferences) options.webPreferences = {};
    
    options.webPreferences.devTools = true;
    options.webPreferences.nodeIntegration = false;
    options.webPreferences.contextIsolation = true;
    options.webPreferences.webSecurity = false;
    
    return options;
}

class PluginLoader {
    constructor(app) {
        this.pluginsPath = path.join(app.getPath('userData'), 'plugins');
        if (!fs.existsSync(this.pluginsPath)) {
            fs.mkdirSync(this.pluginsPath, { recursive: true });
        }
    }
    getPlugins() {
        const plugins = [];
        try {
            if (!fs.existsSync(this.pluginsPath)) return [];
            const files = fs.readdirSync(this.pluginsPath);
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(this.pluginsPath, file), 'utf8');
                    plugins.push({ id: file.replace('.js', ''), content });
                }
            });
        } catch (e) {
            console.error('sleek | failed to load plugins:', e);
        }
        return plugins;
    }
}

class ThemeManager {
    constructor(app) {
        this.themesPath = path.join(app.getPath('userData'), 'themes');
        this.quickCSSPath = path.join(app.getPath('userData'), 'quick.css');
        if (!fs.existsSync(this.themesPath)) {
            fs.mkdirSync(this.themesPath, { recursive: true });
        }
    }
    getThemes() {
        try {
            return fs.readdirSync(this.themesPath).filter(f => f.endsWith('.css'));
        } catch (e) {
            return [];
        }
    }
    getThemeContent(name) {
        try {
            return fs.readFileSync(path.join(this.themesPath, name), 'utf8');
        } catch (e) {
            return '';
        }
    }
    getQuickCSS() {
        try {
            if (fs.existsSync(this.quickCSSPath)) {
                return fs.readFileSync(this.quickCSSPath, 'utf8');
            }
        } catch (e) {}
        return '';
    }
    saveQuickCSS(content) {
        try {
            fs.writeFileSync(this.quickCSSPath, content);
        } catch (e) {}
    }
}

let settings = null;
let pluginLoader = null;
let themeManager = null;

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    const exports = originalLoad.apply(this, arguments);
    
    if (request === 'electron') {
        const { app, ipcMain, BrowserWindow } = exports;

        if (app && !app.__sleek_hooked) {
            app.__sleek_hooked = true;
            settings = new SettingsManager(app);
            pluginLoader = new PluginLoader(app);
            themeManager = new ThemeManager(app);
            
            // fix for macos keychain issues (otherwise everytime you patch, it'll ask for your password)
            app.commandLine.appendSwitch('password-store', 'basic');
            app.commandLine.appendSwitch('use-mock-keychain');
            
            // kill security features that get in our way
            app.commandLine.appendSwitch('disable-features', 'ContentSecurityPolicy');
            app.commandLine.appendSwitch('disable-site-isolation-trials');
            app.commandLine.appendSwitch('disable-web-security');
            
            if (exports.safeStorage && typeof exports.safeStorage.setUseMockKey === 'function') {
                exports.safeStorage.setUseMockKey(true);
            }
            ipcMain.handle('sleek-get-settings', () => settings.data);
            ipcMain.on('sleek-set-setting', (event, { key, value }) => {
                settings.set(key, value);
            });
            ipcMain.handle('sleek-get-plugins', () => pluginLoader.getPlugins());
            ipcMain.handle('sleek-get-themes', () => themeManager.getThemes());
            ipcMain.handle('sleek-get-theme-content', (event, name) => themeManager.getThemeContent(name));
            ipcMain.handle('sleek-get-quick-css', () => themeManager.getQuickCSS());
            ipcMain.on('sleek-save-quick-css', (event, content) => themeManager.saveQuickCSS(content));
            ipcMain.on('sleek-save-debug-info', (event, { data, filename }) => {
                const p = path.join(app.getPath('userData'), filename || 'sleek-debug.html');
                fs.writeFileSync(p, data);
            });

            fs.watch(pluginLoader.pluginsPath, (eventType, filename) => {
                if (filename && filename.endsWith('.js')) {
                    BrowserWindow.getAllWindows().forEach(bw => {
                        bw.webContents.executeJavaScript(`
                            if (window.sleek && window.sleek.plugins) {
                                window.sleek.plugins.reload();
                            }
                        `).catch(() => {});
                    });
                }
            });

            fs.watch(themeManager.themesPath, (eventType, filename) => {
                if (filename && filename.endsWith('.css')) {
                    BrowserWindow.getAllWindows().forEach(bw => {
                        bw.webContents.executeJavaScript(`
                            if (window.sleek && window.sleek.themes) {
                                window.sleek.themes.reload();
                            }
                        `).catch(() => {});
                    });
                }
            });

            app.on('session-created', (session) => {
                session.webRequest.onHeadersReceived(stripCSP);
            });
            app.on('ready', () => {
                const { session } = require('electron');
                session.defaultSession.webRequest.onHeadersReceived(stripCSP);
            });

            app.on('browser-window-created', (event, bw) => {
                bw.webContents.on('before-input-event', (event, input) => {
                    if (input.type === 'keyDown') {
                        const isMac = process.platform === 'darwin';
                        const isI = input.code === 'KeyI';
                        const isCmd = isMac ? input.meta : input.control;
                        const isAlt = input.alt;

                        if (isCmd && isAlt && isI) {
                            bw.webContents.toggleDevTools();
                            event.preventDefault();
                        }
                    }
                });

                let injected = false;
                const inject = () => {
                    if (injected) return;
                    if (!CORE_CODE) return;
                    injected = true;
                    const plugins = pluginLoader.getPlugins();
                    const initScript = `
                        window.__sleek_settings = ${JSON.stringify(settings.data)};
                        window.__sleek_initial_plugins = ${JSON.stringify(plugins)};
                    `;
                    
                    bw.webContents.executeJavaScript(initScript).then(() => {
                        bw.webContents.executeJavaScript(CORE_CODE);
                    }).catch(e => {
                        console.error('sleek | injection failed:', e);
                    });
                };

                bw.webContents.on('did-finish-load', inject);
                bw.webContents.on('dom-ready', inject);
            });
        }
        if (BrowserWindow && !BrowserWindow.__sleek_patched) {
            const OriginalBrowserWindow = BrowserWindow;
            
            const PatchedBrowserWindow = class extends OriginalBrowserWindow {
                constructor(options) {
                    super(patchWebPreferences(options));
                }
            };
            
            Object.assign(PatchedBrowserWindow, OriginalBrowserWindow);
            PatchedBrowserWindow.__sleek_patched = true;
            
            try {
                exports.BrowserWindow = PatchedBrowserWindow;
            } catch (e) {
                Object.defineProperty(exports, 'BrowserWindow', {
                    get: () => PatchedBrowserWindow,
                    configurable: true,
                    enumerable: true
                });
            }
        }
    }
    
    return exports;
};

console.log('sleek | hook ready');
