window.sleek = {
    version: '0.1.0',
    active: true,
    settings,
    plugins: pluginManager,
    themes: themeManager,
    Plugin,
    bus,
    observer: settingsObserver,
    check: injectSettings,
    reload: () => location.reload(),
    // temporary
    patchComponent: (name, patcher) => {
        if (!window.__sleek_patches) window.__sleek_patches = {};
        window.__sleek_patches[name] = patcher;
        console.log(`sleek | registered patch for ${name}`);
        return () => delete window.__sleek_patches[name];
    }
};
