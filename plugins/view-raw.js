(function(sleek) {
    const plugin = new sleek.Plugin({
        id: 'view-raw',
        name: 'raw view',
        description: 'view raw json data of a message via action bar button',
    });

    let overlay = null;
    const messageStore = new Map();

    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const createOverlay = (json) => {
        if (overlay) overlay.remove();
        overlay = document.createElement('div');
        overlay.id = 'sleek-viewraw-overlay';
        overlay.innerHTML = `
            <div class="sleek-viewraw-backdrop"></div>
            <div class="sleek-viewraw-modal">
                <div class="sleek-viewraw-header">
                    <span>Raw Message Data</span>
                    <button class="sleek-viewraw-close">&times;</button>
                </div>
                <pre class="sleek-viewraw-content">${escapeHtml(JSON.stringify(json, null, 2))}</pre>
                <div class="sleek-viewraw-footer">
                    <button class="sleek-viewraw-copy">Copy JSON</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.sleek-viewraw-backdrop').onclick = () => overlay.remove();
        overlay.querySelector('.sleek-viewraw-close').onclick = () => overlay.remove();
        overlay.querySelector('.sleek-viewraw-copy').onclick = () => {
            navigator.clipboard.writeText(JSON.stringify(json, null, 2));
            const btn = overlay.querySelector('.sleek-viewraw-copy');
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy JSON'; }, 1500);
        };
    };
    const RAW_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" data-pcs="true" data-qa="plug" aria-hidden="true" class=""><path fill="currentColor" fill-rule="evenodd" d="M15.28 4.28a.75.75 0 1 0-1.06-1.06L12 5.44l-.97-.97a.75.75 0 0 0-1.06 0l-2 2a4.993 4.993 0 0 0-.378 6.637l-2.246 2.434a1.427 1.427 0 0 1-2.164-.077l-.346-.433a.75.75 0 1 0-1.172.938l.347.432a2.928 2.928 0 0 0 4.437.157l2.243-2.43a4.994 4.994 0 0 0 6.34-.598l2-2a.75.75 0 0 0 0-1.06l-.97-.97 2.22-2.22a.75.75 0 1 0-1.061-1.06L15 8.44 13.06 6.5zm-3.81 2.75 3 3 .97.97-1.47 1.47a3.493 3.493 0 0 1-4.94-4.94l1.47-1.47z" clip-rule="evenodd"></path></svg>
    `;

    const storeMessage = (msg) => {
        if (msg && msg.ts) {
            messageStore.set(msg.ts, msg);
            if (messageStore.size > 2000) {
                const oldest = messageStore.keys().next().value;
                messageStore.delete(oldest);
            }
        }
    };
    const onMessage = (data) => {
        if (data.type === 'message') storeMessage(data);
    };

    const injectViewRawButton = (actionBar) => {
        if (actionBar.querySelector('.sleek-viewraw-btn')) return;
        const toolbar = actionBar.querySelector('.c-message_actions__group') || actionBar.firstElementChild || actionBar;
        const forwardBtn = toolbar.querySelector('[data-qa="share_message"]');
        if (!forwardBtn) return;

        
        const btn = forwardBtn.cloneNode(true);
        btn.innerHTML = RAW_ICON;
        btn.classList.add('sleek-viewraw-btn');
        btn.setAttribute('aria-label', 'View Raw');
        btn.setAttribute('data-qa', 'sleek_viewraw');
        btn.removeAttribute('aria-keyshortcuts');
        btn.removeAttribute('data-focus-metadata');
        btn.title = 'View Raw';

        btn.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const msg = actionBar.closest('[data-msg-ts]');
            if (!msg) return;
            const ts = msg.getAttribute('data-msg-ts');
            let raw = messageStore.get(ts);
            if (raw) return createOverlay(raw);

            const channel = msg.getAttribute('data-msg-channel-id');
            const token = window.__sleek_api_token;
            if (channel && token) {
                try {
                    const res = await fetch('/api/conversations.history', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            token, channel,
                            latest: ts, inclusive: 'true', limit: '1',
                        }),
                    });
                    const json = await res.json();
                    if (json.ok && json.messages?.[0]) {
                        raw = json.messages[0];
                        storeMessage(raw);
                        return createOverlay(raw); }
                } catch (err) {
                    console.error('sleek | view-raw: api fetch failed', err);
                }}
            const textEl = msg.querySelector('.c-message__message_blocks');
            createOverlay({ _sleek: 'api fetch failed', ts, channel, text: textEl?.textContent || '' });
        }, true);

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, true);

        const moreBtn = toolbar.querySelector('[data-qa="more_message_actions"]')
                     || toolbar.querySelector('[aria-label="More actions"]');
        if (moreBtn) toolbar.insertBefore(btn, moreBtn);
        else toolbar.appendChild(btn);
    };

    const style = document.createElement('style');
    style.id = 'sleek-viewraw-styles';
    style.textContent = `
        .sleek-viewraw-backdrop {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 99998;
        }
        .sleek-viewraw-modal {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1d21;
            border: 1px solid #333;
            border-radius: 8px;
            width: 600px; max-height: 70vh;
            display: flex; flex-direction: column;
            z-index: 99999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .sleek-viewraw-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #333;
            font-weight: 700; color: #fff; font-size: 14px;
        }
        .sleek-viewraw-close {
            background: none; border: none;
            color: #999; font-size: 20px; cursor: pointer;
            padding: 0 4px;
        }
        .sleek-viewraw-close:hover { color: #fff; }
        .sleek-viewraw-content {
            padding: 16px;
            overflow: auto; flex: 1;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 12px; line-height: 1.5;
            color: #d1d2d3;
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .sleek-viewraw-footer {
            padding: 8px 16px;
            border-top: 1px solid #333;
            text-align: right;
        }
        .sleek-viewraw-copy {
            background: #4a154b;
            color: #fff; border: none;
            padding: 6px 16px; border-radius: 4px;
            font-size: 12px; cursor: pointer;
        }
        .sleek-viewraw-copy:hover { background: #611f69; }
    `;

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.classList.contains('c-message_actions__container')) injectViewRawButton(node);
                else if (node.querySelectorAll) node.querySelectorAll('.c-message_actions__container').forEach(injectViewRawButton);
            }
        }
    });

    plugin.onStart = () => {
        document.head.appendChild(style);
        sleek.bus.on('ws-message', onMessage);
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.c-message_actions__container').forEach(injectViewRawButton);
        console.log('sleek | view-raw active');
    };
    plugin.onStop = () => {
        if (style.parentNode) style.parentNode.removeChild(style);
        if (overlay) overlay.remove();
        observer.disconnect();
        document.querySelectorAll('.sleek-viewraw-btn').forEach(b => b.remove());
        console.log('sleek | view-raw stopped');
    };

    sleek.plugins.register(plugin);
})(window.sleek);
