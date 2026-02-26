const tabRenderers = {
    general: renderGeneralTab,
    plugins: renderPluginsTab,
    themes: renderThemesTab,
    'quick-css': renderQuickCSSTab,
};

const injectSettings = () => {
    const modal = document.querySelector('.p-prefs_dialog__modal')||document.querySelector('.p-prefs_modal')||document.querySelector('[aria-label="Preferences"][role="dialog"]');
    if (!modal) return;
    const sidebar = modal.querySelector('.p-prefs_dialog__menu')||modal.querySelector('.c-tabs__tab_menu--vertical')||modal.querySelector('.c-tabs__list')||modal.querySelector('[role="tablist"]');
    if (!sidebar||document.getElementById('sleek-settings-header'))return;
    
    sidebar.style.overflowY='auto';
    sidebar.style.maxHeight='100%';

    const showSleekTab = (tabId, btn) => {
        modal.querySelectorAll('.c-tabs__tab--active, .sleek-settings-tab').forEach(el => {
            el.classList.remove('c-tabs__tab--active');
            el.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('c-tabs__tab--active');
        btn.setAttribute('aria-selected', 'true');

        const panel = modal.querySelector('[role="tabpanel"]') || modal.querySelector('.p-prefs_dialog__panel');
        if (!panel) return;
        Array.from(panel.children).forEach(child => {
            if (child.id !== 'sleek-panel-content') child.style.display = 'none';
        });
        let sleekContent = panel.querySelector('#sleek-panel-content');
        if (!sleekContent) {
            sleekContent = document.createElement('div');
            sleekContent.id = 'sleek-panel-content';
            panel.appendChild(sleekContent);
        }
        sleekContent.style.display = 'block';

        const renderer = tabRenderers[tabId];
        if (renderer) {
            renderer(sleekContent);
            if (tabId === 'plugins') pluginManager.onUpdate = () => renderer(sleekContent);
        }
    };

    const deactivateSleekTabs = () => {
        sidebar.querySelectorAll('.sleek-settings-tab').forEach(el => {
            el.classList.remove('c-tabs__tab--active');
            el.setAttribute('aria-selected', 'false');
        });
        const panel = modal.querySelector('[role="tabpanel"]') || modal.querySelector('.p-prefs_dialog__panel');
        if (panel) {
            const sleekContent = panel.querySelector('#sleek-panel-content');
            if (sleekContent) sleekContent.style.display = 'none';
            Array.from(panel.children).forEach(child => {
                if (child.id !== 'sleek-panel-content') child.style.display = '';
            });
        }
    };
    sidebar.addEventListener('click', (e) => {
        const nativeTab = e.target.closest('.c-tabs__tab:not(.sleek-settings-tab)');
        if (nativeTab) deactivateSleekTabs();
    });

    const header = document.createElement('div');
    header.id = 'sleek-settings-header';
    header.style.cssText = `display: flex; align-items: center; padding: 24px 16px 8px; margin-top: 8px; font-family: Slack-Lato, appleLogo, sans-serif; font-weight: 900; font-size: 11px; color: #ababad; user-select: none;`;
    header.innerHTML = `<span style="opacity: 0.8;">sleek</span>`;
    sidebar.appendChild(header);

    Object.keys(tabRenderers).forEach(tabId => {
        const btn = document.createElement('button');
        btn.id = `sleek-tab-${tabId}`;
        btn.className = 'c-button-unstyled c-tabs__tab js-tab c-tabs__tab--full_width sleek-settings-tab';
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
        btn.innerHTML = `<span class="c-tabs__tab_content"><span>${tabId}</span></span>`;
        btn.onclick = () => showSleekTab(tabId, btn);
        sidebar.appendChild(btn);
    });
};

const settingsObserver = new MutationObserver(() => {
    const hasModal = document.querySelector('.p-prefs_dialog__modal')||document.querySelector('.p-prefs_modal')||document.querySelector('[aria-label="Preferences"][role="dialog"]');
    if (hasModal && !document.getElementById('sleek-settings-header')) injectSettings();
});

settingsObserver.observe(document.body, { childList: true, subtree: true });
