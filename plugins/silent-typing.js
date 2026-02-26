(function(sleek) {
    const plugin = new sleek.Plugin({
        id: 'silent-typing',
        name: 'silent typing',
        description: 'you cant see me but i can see you',
    });

    const onBeforeSend = (data) => {
        if (data.type === 'user_typing') {
            return false;
        }
        return data;
    };

    plugin.onStart = () => {
        sleek.bus.on('ws-before-send', onBeforeSend);
        console.log('sleek | silent typing active');
    };

    plugin.onStop = () => {
        console.log('sleek | silent typing stopped');
    };

    sleek.plugins.register(plugin);
})(window.sleek);
