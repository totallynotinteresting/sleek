const settings = {
    data: window.__sleek_settings || {},
    get(key, defaultValue) {
        return this.data[key] !== undefined ? this.data[key] : defaultValue;
    },
    set(key, value) {
        this.data[key] = value;
        if (window.sleekBridge) window.sleekBridge.setSetting(key, value);
    }
};
