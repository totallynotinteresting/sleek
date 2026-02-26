const { contextBridge, ipcRenderer, webFrame } = require('electron');

console.log('sleek | preload bootstrapperr');
const hookCode = `
(function() {
    if (window.__sleek_ws_hooked) return;
    window.__sleek_ws_hooked = true;
    window.__sleek_ws_queue = [];
    window.__sleek_deleted_ts = new Set();

    const OriginalWS = window.WebSocket;
    const origProto = OriginalWS.prototype;
    const processData = (rawData, direction) => {
        let data;
        try { data = JSON.parse(rawData); } catch (e) { return rawData; }

        const evBefore = direction === 'in' ? 'ws-before-message' : 'ws-before-send';
        const evPost   = direction === 'in' ? 'ws-message' : 'ws-send';

        if (window.sleek && window.sleek.bus) {
            const result = window.sleek.bus.emit(evBefore, data);
            if (result === false) return null;
            if (typeof result === 'object' && result !== null) data = result;
            window.sleek.bus.emit(evPost, data);
            const out = JSON.stringify(data);
            return out === rawData ? rawData : out;
        } else if (direction === 'in') {
            window.__sleek_ws_queue.push(data);
        }
        return rawData;
    };

    const origAEL = origProto.addEventListener;
    origProto.addEventListener = function(type, listener, options) {
        if (type === 'message' && listener) {
            const wrapped = function(event) {
                const result = processData(event.data, 'in');
                if (result === null) return;
                if (result === event.data) {
                    if (typeof listener === 'function') return listener.call(this, event);
                    if (listener.handleEvent) return listener.handleEvent(event);
                    return;
                }
                const newEvent = new MessageEvent('message', {
                    data: result, origin: event.origin,
                    lastEventId: event.lastEventId,
                    source: event.source, ports: event.ports
                });
                if (typeof listener === 'function') listener.call(this, newEvent);
                else if (listener.handleEvent) listener.handleEvent(newEvent);
            };
            wrapped.__sleek_orig = listener;
            return origAEL.call(this, type, wrapped, options);
        }
        return origAEL.call(this, type, listener, options);
    };

    const nativeDesc = Object.getOwnPropertyDescriptor(origProto, 'onmessage');
    if (nativeDesc && nativeDesc.set) {
        Object.defineProperty(origProto, 'onmessage', {
            get: function() { return this.__sleek_onmsg_orig || nativeDesc.get.call(this); },
            set: function(fn) {
                this.__sleek_onmsg_orig = fn;
                if (!fn) { nativeDesc.set.call(this, null); return; }
                const wrapped = function(event) {
                    const result = processData(event.data, 'in');
                    if (result === null) return;
                    if (result === event.data) return fn.call(this, event);
                    const newEvent = new MessageEvent('message', {
                        data: result, origin: event.origin,
                        lastEventId: event.lastEventId,
                        source: event.source, ports: event.ports
                    });
                    fn.call(this, newEvent);
                };
                nativeDesc.set.call(this, wrapped);
            },
            configurable: true, enumerable: true
        });
    }
    const origSend = origProto.send;
    origProto.send = function(data) {
        const result = processData(data, 'out');
        if (result === null) return;
        return origSend.call(this, result);
    };
    window.WebSocket = function(url, protocols) {
        console.log('sleek | ws connected:', url);
        try {
            const u = new URL(url);
            const token = u.searchParams.get('token');
            if (token) window.__sleek_api_token = token;
        } catch(e) {}
        return new OriginalWS(url, protocols);
    };
    Object.assign(window.WebSocket, OriginalWS);
    window.WebSocket.prototype = origProto;

    window.__sleek_original_fetch = window.fetch;

    console.log('sleek | early hooks injected');
})();
`;

try {
    webFrame.executeJavaScript(hookCode);
    console.log('sleek | early hooks injected');
} catch (e) {
    console.error('sleek | early hook injection failed:', e);
}

try {
    contextBridge.exposeInMainWorld('sleekBridge', {
        send: (channel, data) => ipcRenderer.send(channel, data),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        setSetting: (key, value) => ipcRenderer.send('sleek-set-setting', { key, value }),
        getSettings: () => ipcRenderer.invoke('sleek-get-settings'),
        getPlugins: () => ipcRenderer.invoke('sleek-get-plugins')
    });
} catch (e) {
    console.error('sleek | bridge exposure failed:', e);
}
