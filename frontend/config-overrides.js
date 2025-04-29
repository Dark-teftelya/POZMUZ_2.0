// config-overrides.js
module.exports = function override(config) {
    config.module.rules = config.module.rules.map(rule => {
      if (rule.loader && rule.loader.includes('source-map-loader')) {
        return {
          ...rule,
          exclude: [/node_modules\/music-metadata/, /node_modules\/readable-web-to-node-stream/]
        };
      }
      return rule;
    });
    return config;
  };