class Plugin {
    constructor(options) {
        this.meta = options;
        this.active = false;
        if (options.onStart) this.onStart = options.onStart;
        if (options.onStop) this.onStop = options.onStop;
    }
    start() {
        try {
            this.onStart();
            this.active = true;
        } catch(e) {
            console.error(`sleek | plugin ${this.meta.id} crashed on start:`, e);
        }
    }
    stop() {
        try {
            this.onStop();
            this.active = false;
        } catch(e) {
            console.error(`sleek | plugin ${this.meta.id} crashed on stop:`, e);
        }
    }
    onStart() {}
    onStop() {}
}

class PluginManager {
    constructor() {
        this.plugins = new Map();
    }
    register(plugin) {
        const id = plugin?.meta?.id;
        if (!plugin || !plugin.meta) return;
        this.plugins.set(id, plugin);
        setTimeout(() => {
            if (settings.get(`plugin-${id}-enabled`, false) && !plugin.active) {
                plugin.start();
            }
        }, 0);
    }
    get(id) { return this.plugins.get(id); }
    toggle(id) {
        const p = this.get(id);
        if (!p) return;
        if (p.active) p.stop(); else p.start();
        settings.set(`plugin-${id}-enabled`, p.active);
    }
    async reload() {
        this.plugins.forEach(p => p.stop());
        this.plugins.clear();

        if (window.sleekBridge) {
            const plugins = await window.sleekBridge.getPlugins();
            const promises = plugins.map(p => new Promise(resolve => {
                try {
                    const wrappedContent = `(function(sleek){ ${p.content} })(window.sleek);`;
                    const blob = new Blob([wrappedContent], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const script = document.createElement('script');
                    script.src = url;
                    script.onload = () => { URL.revokeObjectURL(url); resolve(); };
                    script.onerror = () => resolve();
                    document.head.appendChild(script);
                } catch (e) {
                    resolve();
                }
            }));

            await Promise.all(promises);
            await new Promise(r => setTimeout(r, 100));
        }
        if (this.onUpdate) this.onUpdate();
    }
}

const pluginManager = new PluginManager();
