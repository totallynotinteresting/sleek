(function(sleek) {
    const plugin = new sleek.Plugin({
        id: 'perf-launch',
        name: 'perf launch',
        description: 'defers non-essential loads during startup to speed up boot',
    });
    const alwaysBlocked = [
        '/api/help.issues',
        '/api/admin.promo',
        '/api/banners',
        '/api/premium.info',
    ];
    const startupDeferred = [
        '/api/canvas',
        '/api/files.canvas',
        '/api/workflows',
        '/api/apps.hosted',
        '/api/clips',
        '/api/huddles',
        '/api/calls',
        '/api/emoji.list',
        '/api/emoji.getInfo',
        '/api/reminders.list',
        '/api/stars.list',
        '/api/saved.list',
        '/api/dnd.info',
        '/api/experiments',
        '/api/client.counts',
        '/api/search.boot',
        '/api/search.suggest',
        '/api/chat.unfurl',
        '/api/unfurls',
        '/api/users.counts',
        '/api/users.info',
        '/api/team.info',
        '/api/team.billing.info',
        '/logging/',
        '/beacon/',
        'lottie',
        'giphy',
        'v1/vendor',
        'v1/common',
    ];

    let originalFetch = null;
    let originalXHRSend = null;
    let blocked = 0;
    let startupDone = false;
    let startupTimer = null;

    const shouldBlock = (url) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        if (alwaysBlocked.some(p => lower.includes(p))) return true;
        if (!startupDone && startupDeferred.some(p => lower.includes(p))) return true;
        return false;
    };

    const perfStyle = document.createElement('style');
    perfStyle.id = 'sleek-perf-styles';
    perfStyle.textContent = `
        .sleek-perf-boost *, .sleek-perf-boost *::before, .sleek-perf-boost *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
        }
    `

    plugin.onStart = () => {
        document.head.appendChild(perfStyle);
        document.body.classList.add('sleek-perf-boost');

        startupTimer = setTimeout(() => {
            document.body.classList.remove('sleek-perf-boost');
            startupDone = true;
        }, 8000);

        originalFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : (input?.url || '');
            if (shouldBlock(url)) {
                blocked++;
                return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
            }
            return originalFetch.apply(this, arguments);
        };

        originalXHRSend = XMLHttpRequest.prototype.send;
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this.__sleek_perf_url = url;
            return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function(body) {
            if (shouldBlock(this.__sleek_perf_url)) {
                blocked++;
                return;
            }
            return originalXHRSend.apply(this, arguments);
        };
    };

    plugin.onStop = () => {
        if (perfStyle.parentNode) perfStyle.parentNode.removeChild(perfStyle);
        document.body.classList.remove('sleek-perf-boost');
        if (originalFetch) window.fetch = originalFetch;
        if (originalXHRSend) XMLHttpRequest.prototype.send = originalXHRSend;
        if (startupTimer) clearTimeout(startupTimer);
    };

    sleek.plugins.register(plugin);
})(window.sleek);
