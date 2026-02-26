async function renderThemesTab(panel) {
    const themes = await window.sleekBridge.invoke('sleek-get-themes');
    
    panel.innerHTML = `
        <div style="padding: 32px; color: #fff; font-family: Slack-Lato, appleLogo, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h1 style="font-size: 28px; font-weight: 900; margin: 0;">themes</h1>
            </div>
            <div id="sleek-theme-list" style="margin-top: 24px;"></div>
        </div>
    `;

    const list = panel.querySelector('#sleek-theme-list');
    
    const noneRow = document.createElement('div');
    noneRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;';
    noneRow.innerHTML = `
        <div>
            <div style="font-weight: 700; font-size: 15px;">default</div>
            <div style="font-size: 13px; opacity: 0.7; margin-top: 4px;">no theme applied</div>
        </div>
    `;
    const noneBtn = document.createElement('button');
    noneBtn.textContent = (themeManager.activeTheme === null) ? 'selected' : 'select';
    noneBtn.disabled = (themeManager.activeTheme === null);
    noneBtn.style.cssText = `background: none; border: none; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 13px; color: ${themeManager.activeTheme === null ? '#ababad' : '#2eb67d'};`;
    noneBtn.onclick = () => {
        themeManager.clearTheme();
        renderThemesTab(panel);
    };
    noneRow.appendChild(noneBtn);
    list.appendChild(noneRow);

    themes.forEach(theme => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;';
        const info = document.createElement('div');
        info.innerHTML = `
            <div style="font-weight: 700; font-size: 15px;">${theme}</div>
        `;
        const selectBtn = document.createElement('button');
        const isActive = themeManager.activeTheme === theme;
        selectBtn.textContent = isActive ? 'selected' : 'select';
        selectBtn.disabled = isActive;
        selectBtn.style.cssText = `background: none; border: none; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 13px; color: ${isActive ? '#ababad' : '#2eb67d'};`;
        
        selectBtn.onclick = async () => {
            await themeManager.loadTheme(theme);
            renderThemesTab(panel);
        };

        row.appendChild(info);
        row.appendChild(selectBtn);
        list.appendChild(row);
    });
}
