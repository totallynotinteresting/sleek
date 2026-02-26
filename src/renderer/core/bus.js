const bus = {
    listeners: {},
    on(event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
    },
    emit(event, data) {
        if (!this.listeners[event]) return data;
        let currentData = data;
        for (const cb of this.listeners[event]) {
            const result = cb(currentData);
            if (result === false) return false;
            if (typeof result === 'object' && result !== null) currentData = result;
        }
        return currentData;
    }
};

if (window.__sleek_ws_queue) {
    setTimeout(() => {
        while (window.__sleek_ws_queue.length > 0) bus.emit('ws-message', window.__sleek_ws_queue.shift());
    }, 1000);
}
