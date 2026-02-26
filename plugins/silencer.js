sleek.plugins.register(new sleek.Plugin({
    id: 'pesky-logs',
    name: 'pesky logs',
    description: 'removes those pesky internal logs while keeping sleeks beautiful logs visible. (its very crude atm)',
    onStart: () => {
        const originals = {
            log: console.log,
            info: console.info,
            debug: console.debug,
            warn: console.warn
        };

        const blocked = [
            '[API-Q]', '[UFM]', '[DEVICE-PERMISSIONS-MA]', '[QUIP]', '[SERVICE-WORKER]',
            '[DEVICE-PREFS]', '[CRDT]', '[COUNTS]', '[ALLTHREADSROWELEMENT]',
            '[PLATFORM-CHANNEL-ACTI]', '[CHECK-UNREADS]', '[MESSAGE-LIST]',
            '[UFM-REACJITRIGGERS]', '[DND]', '[DND_V2]', '[FOCUS-EVENT]',
            '[VISIBILITY-STATE]', '[NAVIGATE-IN-MAIN-WIND]', '[APPLY-DETAIL-VIEW]',
            '[NAVIGATION-MIDDLEWARE]', '[NAVIGATE-LISTENERS]', '[HISTORY-FETCH]',
            '[UFM-PERMISSIONS]', '[HISTORY-CFM]', '[PINS]', '[MESSAGEPANEINPUT]',
            '[ACTION:MESSAGE]', '[ACTION:MESSAGE-Q]', '[NOTIFICATIONS]',
            '[UNREAD-COUNTS]', '[SET-LAST-READ]', '[RTM-BADGE-COUNTS-UPDA]',
            'Refreshing all permissions', 'received ASSIGN_CHANNEL_MANAGER',
            'Breadcrumb:', 'componentWillReceiveProps'
        ];

        const filter = (args, originalFn) => {
            const msg = args.join(' ');
            if (msg.includes('sleek |')) {
                return originalFn.apply(console, args);
            }
            if (blocked.some(tag => msg.includes(tag))) {
                return;
            }
            return originalFn.apply(console, args);
        };

        console.log = (...args) => filter(args, originals.log);
        console.info = (...args) => filter(args, originals.info);
        console.debug = (...args) => filter(args, originals.debug);
        console.warn = (...args) => filter(args, originals.warn);

        window.__sleek_originals = originals;
        console.log('sleek | log silencer active. much better!');
    },
    onStop: () => {
        if (window.__sleek_originals) {
            console.log = window.__sleek_originals.log;
            console.info = window.__sleek_originals.info;
            console.debug = window.__sleek_originals.debug;
            console.warn = window.__sleek_originals.warn;
            delete window.__sleek_originals;
        }
        console.log('sleek | log silencer stopped. back to noise ):');
    }
}));
