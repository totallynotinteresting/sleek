async function renderQuickCSSTab(panel) {
    const quickCSS = await window.sleekBridge.invoke('sleek-get-quick-css');
    panel.innerHTML = `<div style="padding: 32px; color: #fff; font-family: Slack-Lato, appleLogo, sans-serif; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h1 style="font-size: 28px; font-weight: 900; margin: 0;">quick css</h1>
            </div>
            <textarea id="sleek-quick-css-editor" spellcheck="false" style="flex: 1; background: #1a1d21; color: #d1d2d3; border: 1px solid #333; border-radius: 8px; padding: 16px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; resize: none; outline: none; transition: border-color 0.2s;">${quickCSS}</textarea>
            <div style="margin-top: 16px; font-size: 12px; opacity: 0.5;">changes apply in real-time. saves automatically.</div>
        </div>`;
    const editor = panel.querySelector('#sleek-quick-css-editor');
    editor.addEventListener('input', () => { const content = editor.value; themeManager.applyQuickCSS(content); window.sleekBridge.send('sleek-save-quick-css', content); });
    editor.addEventListener('focus', () => { editor.style.borderColor = '#4a154b'; });
    editor.addEventListener('blur', () => { editor.style.borderColor = '#333'; });
}
