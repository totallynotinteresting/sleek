(function(sleek) {
    const plugin = new sleek.Plugin({
        id: 'reply',
        name: 'reply',
        description: 'invisible quote reply button on messages',
    });

    const getMessageLink = (actionBar) => {
        const msg = actionBar.closest('[data-msg-ts]');
        if (msg) {
            const ts = msg.getAttribute('data-msg-ts');
            const channel = msg.getAttribute('data-msg-channel-id');
            if (ts && channel) {
                let link = `https://${window.location.hostname}/archives/${channel}/p${ts.replace('.', '')}`;
                const threadPanel = actionBar.closest('.p-flexpane__inside_body_scrollbar, .p-threads_flexpane, .p-thread_view');
                if (threadPanel) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const threadTs = urlParams.get('thread_ts');
                    if (threadTs) {
                        link += `?thread_ts=${threadTs}`;
                    } else {
                        const firstMsg = threadPanel.querySelector('[data-msg-ts]');
                        if (firstMsg && firstMsg !== msg) {
                            link += `?thread_ts=${firstMsg.getAttribute('data-msg-ts')}`;
                        }}
                }
                return link;}}
        const kit = actionBar.closest('.c-message_kit__message, .c-message_kit__background');
        if (kit) {
            const tsLink = kit.querySelector('a.c-timestamp[data-ts]');
            if (tsLink) return tsLink.href;
        }

        return null;
    };

    const injectReplyButton = (actionBar) => {
        if (actionBar.querySelector('.sleek-reply-btn')) return;
        const toolbar = actionBar.querySelector('.c-message_actions__group')|| actionBar.firstElementChild|| actionBar;
        const forwardBtn = toolbar.querySelector('[data-qa="share_message"]');
        if (!forwardBtn) return;
        const btn = forwardBtn.cloneNode(true);

        const svg = btn.querySelector('svg');
        if (svg) svg.style.transform = 'scaleX(-1)';
        btn.classList.add('sleek-reply-btn');
        btn.setAttribute('aria-label', 'Reply');
        btn.setAttribute('data-qa', 'sleek_reply');
        btn.removeAttribute('aria-keyshortcuts');
        btn.removeAttribute('data-focus-metadata');
        btn.title = 'Reply';
        btn.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const link = getMessageLink(actionBar);
            if (!link) return;
            const threadPanel = actionBar.closest('.p-flexpane__inside_body_scrollbar, .p-threads_flexpane, .p-thread_view');
            const composer = threadPanel ? threadPanel.querySelector('.ql-editor') : document.querySelector('.p-workspace__primary_view .ql-editor') || document.querySelector('.ql-editor');
            if (composer) {
                composer.focus();
                setTimeout(() => {
                    const html = `<a href="${link}" target="_blank" rel="noopener noreferrer" data-stringify-link="${link}" data-stringify-type="link">\u2060</a>&nbsp;`;
                    document.execCommand('insertHTML', false, html);
                }, 50);
            }
        }, true);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);

        const moreBtn = toolbar.querySelector('[data-qa="more_message_actions"]')
                     || toolbar.querySelector('[aria-label="More actions"]');

        if (moreBtn) {
            toolbar.insertBefore(btn, moreBtn);
        } else {
            toolbar.appendChild(btn);
        }
    };

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.classList.contains('c-message_actions__container')) injectReplyButton(node);
                else if (node.querySelectorAll) node.querySelectorAll('.c-message_actions__container').forEach(injectReplyButton);
            }
        }
    });

    plugin.onStart = () => {
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.c-message_actions__container').forEach(injectReplyButton);
        console.log('sleek | reply active');
    };
    plugin.onStop = () => {
        observer.disconnect();
        document.querySelectorAll('.sleek-reply-btn').forEach(b => b.remove());
        console.log('sleek | reply stopped');
    };
    sleek.plugins.register(plugin);
})(window.sleek);
