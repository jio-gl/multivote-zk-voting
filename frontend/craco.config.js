const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          buffer: require.resolve('buffer/'),
          crypto: false,
          fs: false,
          path: false,
          os: false,
          stream: false,
          constants: false,
          readline: false,
          assert: false
        }
      }
    },
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer']
        })
      ]
    }
  }
}; 