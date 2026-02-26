(function(sleek) {
    const logger = new sleek.Plugin({
        id: 'message-logger',
        name: 'msg log',
        description: 'a clone of vencords message logger but on slack?!?!?',
    });

    const deletedTs = new Set();
    const messageHistory = new Map();
    let pendingDeleteTs = null;

    const style = document.createElement('style');
    style.id = 'sleek-logger-styles';
    style.textContent = `
        .sleek-deleted .c-message_kit__background {
            background: rgba(224, 30, 90, 0.08) !important;
            border-left: 3px solid #e01e5a !important;
        }
        .sleek-deleted .c-message_kit__blocks::after {
            content: " [deleted]";
            color: #e01e5a;
            font-size: 0.8em;
            font-style: italic;
        }
        .sleek-deleted {
            opacity: 0.75 !important;
        }
        .sleek-edit-history {
            padding: 2px 0;
            opacity: 0.45;
            font-size: 0.85em;
            color: #ababad;
            text-decoration: line-through;
        }
        .sleek-edit-history::before {
            content: "";
        }
        .sleek-edited-marker {
            color: #888;
            font-size: 0.75em;
            font-style: italic;
            margin-left: 4px;
        }
    `;
    const onClickCapture = (e) => {
        const deleteBtn = e.target.closest('.c-dialog__go[aria-label="Delete"]');
        if (!deleteBtn) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        console.log('sleek | delete clicked');

        let ts = pendingDeleteTs;
        if (!ts) {
            const toolbar = document.querySelector('.c-message_actions__container');
            const msg = toolbar?.closest('[data-item-key]');
            if (msg) ts = msg.dataset.itemKey;
        }

        if (!ts) {
            console.warn('sleek | could not find ts, letting through');
            deleteBtn.click();
            return;
        }

        console.log('sleek | ghosting message:', ts);
        deletedTs.add(ts);

        const dialog = deleteBtn.closest('[role="dialog"], .c-dialog');
        const closeBtn = dialog?.querySelector('.c-dialog__close, [aria-label="Close"]');
        if (closeBtn) closeBtn.click();
        else if (dialog) dialog.remove();
        const msgEl = document.querySelector(`[data-item-key="${ts}"]`);
        const channelEl = msgEl?.querySelector('[data-msg-channel-id]');
        const channel = channelEl?.dataset?.msgChannelId ||
            document.querySelector('[data-msg-channel-id]')?.dataset?.msgChannelId || '';

        const token = window.__sleek_api_token || '';
        if (channel && token) {
            fetch('/api/chat.delete', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ token, channel, ts })
            }).then(r => r.json()).then(res => {
                console.log('sleek | server delete:', res.ok ? 'success' : res.error);
            }).catch(err => console.error('sleek | server delete failed:', err));
        } else {
            console.warn('sleek | missing token or channel, delete not sent to server');
        }
        if (msgEl) {
            msgEl.classList.add('sleek-deleted');
            console.log('sleek | marked as deleted:', ts);
        }
    };
    const onContextMenuClick = (e) => {
        const menuItem = e.target.closest('[data-qa="delete_message"], [data-qa="msg_delete"]');
        if (menuItem) {
            const hovered = document.querySelector('.c-message_kit__hover--hovered');
            const msg = hovered?.closest('[data-item-key]');
            if (msg) {
                pendingDeleteTs = msg.dataset.itemKey;
                console.log('sleek | pending delete tracked:', pendingDeleteTs);
            }
        }
    };
    const injectEditHistory = (ts) => {
        const history = messageHistory.get(ts);
        if (!history || history.length === 0) return;

        const msgEl = document.querySelector(`[data-item-key="${ts}"]`);
        if (!msgEl) return;
        if (msgEl.querySelector('.sleek-edit-history')) return;

        const blocksEl = msgEl.querySelector('.c-message_kit__blocks');
        if (!blocksEl) return;

        for (let i = 0; i < history.length; i++) {
            const histEl = document.createElement('div');
            histEl.className = 'sleek-edit-history';
            histEl.textContent = history[i];
            blocksEl.insertBefore(histEl, blocksEl.firstChild);
        }
    };

    const onBeforeMessage = (data) => {
        if (data.type === 'message' && data.subtype === 'message_deleted') {
            const ts = data.deleted_ts;
            deletedTs.add(ts);
            setTimeout(() => {
                const el = document.querySelector(`[data-item-key="${ts}"]`);
                if (el) el.classList.add('sleek-deleted');
            }, 100);
            return false;
        }

        if (data.type === 'message' && data.subtype === 'message_changed') {
            const ts = data.message?.ts;
            const prev = data.previous_message;
            if (ts && prev?.text) {
                const isReplyLink = prev.text.includes('\u2060') || /^<https?:\/\/[^>]+>\s*$/.test(prev.text.trim());
                if (!isReplyLink) {
                    if (!messageHistory.has(ts)) messageHistory.set(ts, []);
                    messageHistory.get(ts).push(prev.text);
                    setTimeout(() => injectEditHistory(ts), 300);
                }}}
        return data
    }

    const onMessage = (data, prefix = 'in') => {
        if (data.type === 'message' && data.text) {
            const user = data.user || 'system'
        }
    };
    const maintainGhosts = () => {
        deletedTs.forEach(ts => {
            const el = document.querySelector(`[data-item-key="${ts}"]`);
            if (el && !el.classList.contains('sleek-deleted')) {
                el.classList.add('sleek-deleted')
            }
        });
        messageHistory.forEach((_, ts) => injectEditHistory(ts))
    };

    let observer = null;
    let maintainInterval = null;

    logger.onStart = () => {
        document.head.appendChild(style);
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('click', onContextMenuClick, true);

        sleek.bus.on('ws-before-message', onBeforeMessage);
        sleek.bus.on('ws-message', (data) => onMessage(data, 'in'));
        sleek.bus.on('ws-send', (data) => onMessage(data, 'out'));

        maintainInterval = setInterval(maintainGhosts, 500);

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const added of mutation.addedNodes) {
                    if (added.nodeType !== 1) continue;
                    const key = added.dataset?.itemKey;
                    if (key && deletedTs.has(key)) added.classList.add('sleek-deleted');
                    if (key && messageHistory.has(key)) injectEditHistory(key);
                    added.querySelectorAll?.('[data-item-key]').forEach(el => {
                        const ts = el.dataset.itemKey;
                        if (ts && deletedTs.has(ts)) el.classList.add('sleek-deleted');
                        if (ts && messageHistory.has(ts)) injectEditHistory(ts);
                    });
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('sleek | msg logger active');
    };

    logger.onStop = () => {
        if (style.parentNode) style.parentNode.removeChild(style);
        document.removeEventListener('click', onClickCapture, true);
        document.removeEventListener('click', onContextMenuClick, true);
        if (observer) observer.disconnect();
        if (maintainInterval) clearInterval(maintainInterval);
        console.log('sleek | msg logger stopped');
    };

    sleek.plugins.register(logger);
})(window.sleek);
