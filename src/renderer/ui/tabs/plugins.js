function renderPluginsTab(panel) {
    panel.innerHTML = `
        <div style="padding: 32px; color: #fff; font-family: Slack-Lato, appleLogo, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h1 style="font-size: 28px; font-weight: 900; margin: 0;">plugins</h1>
                <div>
                    <button id="sleek-open-plugins-folder" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 700; margin-right: 8px;">
                        open folder
                    </button>
                    <button id="sleek-reload-plugins" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 700;">
                        reload
                    </button>
                </div>
            </div>
            <div id="sleek-plugin-list" style="margin-top: 24px;"></div></div>`;

    const list = panel.querySelector('#sleek-plugin-list');
    if (pluginManager.plugins.size === 0) {
        list.innerHTML = '<div style="opacity: 0.5; padding: 32px 0;">no plugins found</div>';
    } else {
        pluginManager.plugins.forEach(p => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;';

            const info = document.createElement('div');
            info.innerHTML = `<div style="font-weight: 700; font-size: 15px;">${p.meta.name}</div>
                <div style="font-size: 13px; opacity: 0.7; margin-top: 4px;">${p.meta.description}</div>`;
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = p.active ? 'disable' : 'enable';
            toggleBtn.style.cssText = `background: none; border: none; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 13px; color: ${p.active ? '#e01e5a' : '#2eb67d'};`;
            toggleBtn.addEventListener('click', () => {
                pluginManager.toggle(p.meta.id);
                toggleBtn.textContent = p.active ? 'disable' : 'enable';
                toggleBtn.style.color = p.active ? '#e01e5a' : '#2eb67d';
            });

            row.appendChild(info);
            row.appendChild(toggleBtn);
            list.appendChild(row);
        });
    }
    panel.querySelector('#sleek-reload-plugins').addEventListener('click', async () => {
        const btn = panel.querySelector('#sleek-reload-plugins');
        btn.textContent = 'reloading...';
        btn.disabled = true;
        await pluginManager.reload();
        renderPluginsTab(panel);
    });
    panel.querySelector('#sleek-open-plugins-folder').onclick = () => {
        console.error('sleek | clicking open plugins folder');
        console.error('sleek | bridge keys:', window.sleekBridge ? Object.keys(window.sleekBridge) : 'no bridge');
        if (window.sleekBridge && window.sleekBridge.openPluginsFolder) {
            console.error('sleek | calling bridge.openPluginsFolder');
            window.sleekBridge.openPluginsFolder();
        } else {
            console.error('sleek | bridge or openPluginsFolder missing');
        }
    };
}
