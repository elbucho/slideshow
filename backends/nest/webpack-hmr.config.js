module.exports = function (options) {
    return {
        ...options,
        watchOptions: {
            poll: 1000,                 // Poll every 1s - more reliable than native fs events across a Docker bind mount
            aggregateTimeout: 500,      // Batch rapid-fire events from one save into a single rebuild
            ignored: /node_modules/,
        },
    };
};