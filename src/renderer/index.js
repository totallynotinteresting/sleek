if (window.__sleek_initial_plugins) {
    window.__sleek_initial_plugins.forEach(p => {
        try {
            const wrapped = `(function(sleek){ ${p.content} })(window.sleek);`;
            const blob = new Blob([wrapped], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const script = document.createElement('script');
            script.src = url;
            document.head.appendChild(script);
        } catch (e) {
            console.error(`sleek | plugin ${p.id} failed to load`, e);
        }
    });
}

injectSettings();
