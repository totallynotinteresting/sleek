(function() {
    window.sleek = window.sleek || {};
    window.sleek.mappings = new Map();
    const coreMappings = {
        '.p-client_container': 'sleek-app',
        '.p-ia4_client': 'sleek-client',
        '.p-ia4_top_nav': 'sleek-topbar',
        '.p-ia4_client--with-split-view-feature': 'sleek-layout',
        '.p-tab_rail': 'sleek-tab-rail',
        '.p-client_workspace': 'sleek-workspace',
        '.p-workspace__primary_view': 'sleek-legacy-view',
        '.p-view_contents--primary': 'sleek-main-view',
        '.p-workspace__secondary_view': 'sleek-secondary-view',
        '.p-theme_background': 'sleek-bg-layer',
        '.p-view_contents--sidebar': 'sleek-sidebar',
        '.p-channel_sidebar__list': 'sleek-sidebar-list',
        '.p-channel_sidebar__channel': 'sleek-sidebar-channel',
        '.p-channel_sidebar__channel--unread': 'sleek-sidebar-channel-unread',
        '.p-channel_sidebar__channel--selected': 'sleek-sidebar-channel-selected',
        '.c-mention_badge': 'sleek-mention-badge',
        '.p-message_pane': 'sleek-message-pane',
        '.c-message_kit__message': 'sleek-message',
        '.c-message_kit__background--hovered': 'sleek-message-hover',
        '.c-message_kit__sender': 'sleek-message-sender',
        '.c-timestamp': 'sleek-message-timestamp',
        '.p-rich_text_section': 'sleek-message-text',
        '.c-message_attachment': 'sleek-attachment',
        '.c-message__edited_label': 'sleek-edited-label',
        '.c-reaction_bar': 'sleek-reaction-bar',
        '.c-reaction': 'sleek-reaction',
        '.c-reaction_add': 'sleek-reaction-add',
        '.c-wysiwyg_container': 'sleek-input-area',
        '.ql-editor': 'sleek-input-editor',
        '.c-texty_input_unstyled': 'sleek-input-text',
        '.c-message_actions__container': 'sleek-message-actions',
        '.c-dialog__content': 'sleek-modal',
        '.c-popover__content': 'sleek-popover',
        '.c-menu': 'sleek-menu',
        '.c-menu_item__label': 'sleek-menu-item-label',
        '.p-quick_switcher_input': 'sleek-quick-switcher'
    };

    for (const [selector, className] of Object.entries(coreMappings)) {
        window.sleek.mappings.set(selector, className);
    }
    window.sleek.addMapping = (selector, className) => {
        window.sleek.mappings.set(selector, className);
        requestAnimationFrame(() => applyMappings(document.body));
    };

    const applyMappings = (root = document) => {
        window.sleek.mappings.forEach((className, selector) => {
            const elements = root.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.classList.contains(className)) {
                    el.classList.add(className);
                }
            });
        });
    };

    let animationFrameId = null;

    const observer = new MutationObserver((mutations) => {
        let shouldRefire = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldRefire = true;
                break;
            }
        }
        
        if (shouldRefire) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                applyMappings(document.body);
                animationFrameId = null;
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    requestAnimationFrame(() => applyMappings(document.body));
})();
