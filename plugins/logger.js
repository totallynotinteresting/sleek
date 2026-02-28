(function(sleek) {
    const logger = new sleek.Plugin({
        id: 'message-logger',
        name: 'msg log',
        description: 'a clone of vencords message logger but on slack?!?!?',
    });

    const loadSet = (k) => { try { return new Set(JSON.parse(localStorage.getItem(k)||'[]')); } catch{ return new Set(); }};
    const saveSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify([...v])); } catch{} };
    const loadMap = (k) => { try { return new Map(JSON.parse(localStorage.getItem(k)||'[]')); } catch{ return new Map(); }};
    const saveMap = (k, v) => { try { localStorage.setItem(k, JSON.stringify([...v])); } catch{} };

    const deletedTs = loadSet('sleek-logger-deleted-ts');
    const clearedTs = loadSet('sleek-logger-cleared-ts');
    const messageHistory = loadMap('sleek-logger-history');
    let pendingDeleteTs = null;
    const userNameCache = new Map();
    const formatSlackText = (text) => { return text.replace(/<@(U[A-Z0-9]+)(?:\|([^>]+))?>/g, (_, uid, name) => {
                if (name) return `@${name}`;
                if (userNameCache.has(uid)) return `@${userNameCache.get(uid)}`;
                const profileEl = document.querySelector(`[data-message-sender="${uid}"]`);
                const btnEl = profileEl?.querySelector('button.c-message_kit__avatar');
                const displayName = btnEl?.getAttribute('aria-label') || profileEl?.querySelector('.c-message__sender_button')?.textContent;
                if (displayName) { userNameCache.set(uid, displayName); return `@${displayName}`; }
                return `@${uid}`;
            }).replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1').replace(/<#([A-Z0-9]+)>/g, '#$1')
            .replace(/<!here>/g, '@here').replace(/<!channel>/g, '@channel')
            .replace(/<!everyone>/g, '@everyone').replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
            .replace(/<(https?:\/\/[^>]+)>/g, '$1');
    }
    const style = document.createElement('style');
    style.id = 'sleek-logger-styles';
    style.textContent = `
        .sleek-deleted .c-message__sender_button,
        .sleek-deleted .c-message__sender_link,
        .sleek-deleted .c-message_kit__sender {
            color: #e01e5a !important;
        }
        .sleek-deleted .c-message__body,
        .sleek-deleted .c-message_kit__blocks,
        .sleek-deleted .p-rich_text_section {
            color: #e01e5a !important;
        }
        .sleek-deleted {
            opacity: 0.70 !important;
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
        .sleek-logger-menu-item .c-menu_item__button:hover {
            background: var(--slack-color-neutral-05, rgba(29, 28, 29, 0.04)) !important;
        }
        .sleek-logger-menu-item .c-menu_item__button:active {
            background: var(--slack-color-neutral-10, rgba(29, 28, 29, 0.08)) !important;
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
        
        let channel = msgEl?.dataset?.msgChannelId || msgEl?.closest('[data-msg-channel-id]')?.dataset?.msgChannelId;
        if (!channel && msgEl) {
            const tsLink = msgEl.querySelector('a.c-timestamp[data-ts], a[href*="/archives/"]');
            if (tsLink && tsLink.href) {
                const match = tsLink.href.match(/\/archives\/([A-Z0-9]+)/);
                if (match) channel = match[1];
            }
        }
        if (!channel) {
            const urlMatch = window.location.pathname.match(/\/(?:client\/[A-Z0-9]+\/|archives\/|messages\/)([A-Z0-9]+)/);
            if (urlMatch) channel = urlMatch[1];
        }
        channel = channel || document.querySelector('[data-msg-channel-id]')?.dataset?.msgChannelId || '';

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
    const hideElement = (el) => {
        if (!el) return;
        el.style.cssText = 'display: none !important; opacity: 0 !important; pointer-events: none !important; margin: 0 !important; padding: 0 !important; height: 0 !important; min-height: 0 !important; border: none !important;';
        const row = el.closest('[role="listitem"]');
        if (row) row.style.cssText = 'display: none !important; margin: 0 !important; padding: 0 !important; height: 0 !important;';
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
            histEl.textContent = formatSlackText(history[i]);
            blocksEl.insertBefore(histEl, blocksEl.firstChild);
        }
    };

    const onBeforeMessage = (data) => {
        if (data.type === 'message' && data.subtype === 'message_deleted') {
            const ts = data.deleted_ts;
            deletedTs.add(ts);
            saveSet('sleek-logger-deleted-ts', deletedTs);
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
                    saveMap('sleek-logger-history', messageHistory);
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
        clearedTs.forEach(ts => {
            const el = document.querySelector(`[data-item-key="${ts}"]`);
            if (el) hideElement(el);
        });
        messageHistory.forEach((_, ts) => {
            if (!clearedTs.has(ts)) injectEditHistory(ts);
            else {
                const el = document.querySelector(`[data-item-key="${ts}"]`);
                if (el) el.querySelectorAll('.sleek-edit-history').forEach(e => e.style.cssText = 'display: none !important;');
            }
        })
    };

    let activeMenuTs = null;

    const injectMenuItem = (menu) => {
        if (menu.querySelector('.sleek-logger-menu-item')) return;
        const ts = activeMenuTs;
        if (!ts || (!deletedTs.has(ts) && !messageHistory.has(ts))) return;

        const container = menu.querySelector('.c-menu__items') || menu.querySelector('[role="menu"]');
        if (!container) return;

        // Clone an existing item to match native look perfectly
        const existingItem = container.querySelector('.c-menu_item__li');
        if (!existingItem) return;

        const separator = document.createElement('div');
        separator.className = 'c-menu_separator__li c-menu_separator__li--no_first_child';
        separator.innerHTML = `<hr class="c-menu_separator__separator">`;
        container.appendChild(separator);

        const item = existingItem.cloneNode(true);
        item.classList.add('sleek-logger-menu-item');
        item.classList.remove('c-menu_item--hovered', 'c-menu_item--highlighted');
        const innerBtn = item.querySelector('.c-menu_item__button');
        if (innerBtn) innerBtn.classList.remove('c-menu_item__button--hovered', 'c-menu_item__button--highlighted');
        
        const label = item.querySelector('.c-menu_item__label');
        if (label) label.textContent = 'Clear history';
        
        const icon = item.querySelector('.c-menu_item__icon');
        if (icon) icon.remove();
        
        const shortcut = item.querySelector('.c-menu_item__shortcut');
        if (shortcut) shortcut.remove();

        item.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const isDeleted = deletedTs.has(ts);
            
            if (isDeleted) {
                deletedTs.delete(ts);
                clearedTs.add(ts);
                saveSet('sleek-logger-deleted-ts', deletedTs);
                saveSet('sleek-logger-cleared-ts', clearedTs);

                const msgEl = document.querySelector(`[data-item-key="${ts}"]`);
                if (msgEl) {
                    hideElement(msgEl);
                }
            } else {
                messageHistory.delete(ts);
                clearedTs.add(ts);
                saveMap('sleek-logger-history', messageHistory);
                saveSet('sleek-logger-cleared-ts', clearedTs);
                const msg = document.querySelector(`[data-item-key="${ts}"]`);
                if (msg) {
                    msg.classList.remove('sleek-deleted');
                    msg.querySelectorAll('.sleek-edit-history').forEach(el => {
                        el.style.cssText = 'display: none !important;';
                    });
                }
            }

            // Close menu natively using Escape key
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            
            setTimeout(() => {
                const composer = document.querySelector('.ql-editor');
                if (composer) {
                    composer.focus();
                } else {
                    document.body.focus();
                }
            }, 50);
        };

        container.appendChild(item);
    };

    const onActionsClick = (e) => {
        const moreBtn = e.target.closest('[data-qa="more_message_actions"]') || e.target.closest('[aria-label="More actions"]');
        if (!moreBtn) return;
        const msg = moreBtn.closest('[data-item-key]');
        if (msg) {
            activeMenuTs = msg.dataset.itemKey;
            console.log('sleek | tracking overflow menu for:', activeMenuTs);
        }
    };

    const onContextMenu = (e) => {
        const msg = e.target.closest('[data-item-key]');
        if (msg) {
            activeMenuTs = msg.dataset.itemKey;
            console.log('sleek | tracking context menu for:', activeMenuTs);
        }
    };

    let observer = null;
    let maintainInterval = null;

    logger.onStart = () => {
        document.head.appendChild(style);
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('click', onContextMenuClick, true);
        document.addEventListener('mousedown', onActionsClick, true);
        document.addEventListener('contextmenu', onContextMenu, true);

        sleek.bus.on('ws-before-message', onBeforeMessage);
        sleek.bus.on('ws-message', (data) => onMessage(data, 'in'));
        sleek.bus.on('ws-send', (data) => onMessage(data, 'out'));

        maintainInterval = setInterval(maintainGhosts, 500);

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const added of mutation.addedNodes) {
                    if (added.nodeType !== 1) continue;
                    
                    if (added.classList.contains('p-message_actions_menu')) injectMenuItem(added);
                    else added.querySelectorAll?.('.p-message_actions_menu').forEach(injectMenuItem);

                    const key = added.dataset?.itemKey;
                    if (key && deletedTs.has(key)) added.classList.add('sleek-deleted');
                    if (key && clearedTs.has(key)) hideElement(added);
                    if (key && messageHistory.has(key)) injectEditHistory(key);
                    added.querySelectorAll?.('[data-item-key]').forEach(el => {
                        const ts = el.dataset.itemKey;
                        if (ts && deletedTs.has(ts)) el.classList.add('sleek-deleted');
                        if (ts && clearedTs.has(ts)) hideElement(el);
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
