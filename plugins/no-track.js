(function(sleek) {
    const plugin = new sleek.Plugin({
        id: 'no-track',
        name: 'no-no-track',
        description: 'no, no, dont track me there, its what i told my slack but it didnt seem to care',
    });

    const blockedPatterns = [
        '/api/log',
        '/api/beacon',
        '/api/track',
        '/beacon/',
        '/metrics/',
        'analytics',
        'telemetry',
        'eventi',
        '/gantry/',
        'lottie-coverage',
        'collect-dmesg',
        '/api/experiments.getAssignments',
    ];

    let originalFetch = null;
    let originalXHROpen = null;
    let blocked = 0;

    const shouldBlock = (url) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return blockedPatterns.some(p => lower.includes(p));
    };

    plugin.onStart = () => {
        originalFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : (input?.url || '');
            if (shouldBlock(url)) {
                blocked++;
                if (blocked <= 5 || blocked % 50 === 0) {
                }
                return Promise.resolve(new Response('{}', { status: 200 }));
            }
            return originalFetch.apply(this, arguments);
        };
        originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this.__sleek_blocked = shouldBlock(url);
            if (this.__sleek_blocked) {
                blocked++;
                if (blocked <= 5 || blocked % 50 === 0) {
                }
            }
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };

        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            if (this.__sleek_blocked) return;
            return originalXHRSend.apply(this, arguments);
        };

        console.log('sleek | no-track active');
    };

    plugin.onStop = () => {
        if (originalFetch) window.fetch = originalFetch;
        if (originalXHROpen) XMLHttpRequest.prototype.open = originalXHROpen;
        console.log(`sleek | no-track stopped (blocked ${blocked} requests)`);
    };

    sleek.plugins.register(plugin);
})(window.sleek);
