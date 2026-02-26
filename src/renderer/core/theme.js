const themeManager = {
    activeTheme: settings.get('active-theme', null),
    styleTag: null,
    quickStyleTag: null,

    async init() {
        this.styleTag = document.createElement('style');
        this.styleTag.id = 'sleek-theme';
        document.head.appendChild(this.styleTag);

        this.quickStyleTag = document.createElement('style');
        this.quickStyleTag.id = 'sleek-quick-css';
        document.head.appendChild(this.quickStyleTag);

        if (this.activeTheme) this.loadTheme(this.activeTheme);
        const quickCSS = await window.sleekBridge.invoke('sleek-get-quick-css');
        this.applyQuickCSS(quickCSS);
    },
    async loadTheme(name) {
        if (!window.sleekBridge) return;
        const content = await window.sleekBridge.invoke('sleek-get-theme-content', name);
        this.styleTag.textContent = content;
        this.activeTheme = name;
        settings.set('active-theme', name);

        const app = document.querySelector('.sleek-app');
        if (app) app.classList.add('sleek-theme-active');
    },

    clearTheme() {
        this.styleTag.textContent = '';
        this.activeTheme = null;
        settings.set('active-theme', null);

        const app = document.querySelector('.sleek-app');
        if (app) app.classList.remove('sleek-theme-active');
    },

    applyQuickCSS(content) {
        this.quickStyleTag.textContent = content;
    },
    async reload() {
        if (this.activeTheme) this.loadTheme(this.activeTheme);
    }
};

themeManager.init();
