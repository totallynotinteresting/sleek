function renderGeneralTab(panel) {
    const activeCount = [...pluginManager.plugins.values()].filter(p => p.active).length;
    const totalCount = pluginManager.plugins.size;

    panel.innerHTML = `
        <div style="padding: 32px; color: #fff; font-family: Slack-Lato, appleLogo, sans-serif;">
            <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 8px 0;">sleek</h1>
            <p style="font-size: 13px; opacity: 0.5; margin: 0 0 32px 0;">v${window.sleek?.version || '0.1.0'}</p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px;">
                <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 16px;">
                    <div style="font-size: 32px; font-weight: 900;">${activeCount}</div>
                    <div style="font-size: 12px; opacity: 0.5; margin-top: 4px;">active plugins</div>
                </div>
                <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 16px;">
                    <div style="font-size: 32px; font-weight: 900;">${totalCount}</div>
                    <div style="font-size: 12px; opacity: 0.5; margin-top: 4px;">installed</div>
                </div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; opacity: 0.5; margin-bottom: 16px;">quick actions</div>
                <div id="sleek-general-actions" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-top: 24px;">
                <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; opacity: 0.5; margin-bottom: 12px;">loaded plugins</div>
                <div style="font-size: 13px; opacity: 0.7; line-height: 1.8;" id="sleek-general-plugin-list"></div>
            </div>
        </div>
    `;

    const actions = panel.querySelector('#sleek-general-actions');
    const makeBtn = (label, onClick) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; text-align: left; font-family: inherit;';
        b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,0.1)'; });
        b.addEventListener('mouseleave', () => { b.style.background = 'rgba(255,255,255,0.05)'; });
        b.addEventListener('click', onClick);
        return b;
    };

    actions.appendChild(makeBtn('reload plugins', () => pluginManager.reload()));
    actions.appendChild(makeBtn('reload slack', () => location.reload()));
    actions.appendChild(makeBtn('dump debug info', () => {
        const data = document.documentElement.outerHTML;
        window.sleekBridge.send('sleek-save-debug-info', { data, filename: 'sleek-debug.html' });
        alert('sleek | debug info dumped to sleek-debug.html in Slack userData folder');
    }));
    actions.appendChild(makeBtn('open devtools', () => {
        if (window.sleekBridge) window.sleekBridge.send('sleek-open-devtools');
    }));

    const plist = panel.querySelector('#sleek-general-plugin-list');
    pluginManager.plugins.forEach(p => {
        const dot = p.active ? '●' : '○';
        const color = p.active ? '#2eb67d' : '#e01e5a';
        const el = document.createElement('div');
        el.innerHTML = `<span style="color: ${color}; margin-right: 6px;">${dot}</span>${p.meta.name}`;
        plist.appendChild(el);
    });
}
