(function() {
    const MAPPINGS = {
        '.p-client_container': 'sleek-app',
        '.p-ia4_client': 'sleek-client',
        '.p-ia4_top_nav': 'sleek-topbar',
        '.p-ia4_client--with-split-view-feature': 'sleek-layout',
        '.p-tab_rail': 'sleek-tab-rail',
        '.p-channel_sidebar': 'sleek-sidebar',
        '.p-client_workspace': 'sleek-workspace',
        '.p-workspace__primary_view': 'sleek-main-view',
        '.p-message_pane': 'sleek-message-pane',
        '.c-wysiwyg_container': 'sleek-input-area',
        '.p-theme_background': 'sleek-bg-layer'
    };

    const applyMappings = (root = document) => {
        for (const [selector, className] of Object.entries(MAPPINGS)) {
            const elements = root.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`sleek | mapping: found ${elements.length} for ${selector} -> ${className}`);
            }
            elements.forEach(el => {
                if (!el.classList.contains(className)) {
                    el.classList.add(className);
                }
            });
        }
    };

    const observer = new MutationObserver((mutations) => {
        let shouldRefire = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldRefire = true;
                break;
            }
        }
        if (shouldRefire) applyMappings();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    applyMappings();
})();
