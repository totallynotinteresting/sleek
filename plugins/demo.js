console.warn('sleek | demo.js script scope is active!');

sleek.plugins.register(new sleek.Plugin({
    id: 'demo-plugin',
    name: 'demo plugin',
    description: 'just a simple plugin to show sleek is working.',
    onStart: () => {
        console.log('sleek | demo plugin is workin!!');
    },
    onStop: () => {
        console.log('sleek | demo plugin stopped. cyas');
    }
}));
