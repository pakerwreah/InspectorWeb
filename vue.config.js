const webpack = require('webpack')

module.exports = {
  publicPath: './',
  transpileDependencies: ['vuetify'],
  configureWebpack: {
    resolve: {
      fallback: {
        zlib: require.resolve('browserify-zlib'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser')
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser'
      })
    ]
  },
  chainWebpack (config) {
    config.plugin('define').tap(args => {
      args[0]['process.env'].VERSION = JSON.stringify(require('./package.json').version)
      return args
    })
  },
  pluginOptions: {
    electronBuilder: {
      // Provide an array of files that, when changed, will recompile the main process and restart Electron
      // Your main process file will be added by default
      mainProcessWatch: ['src/native/*'],
      // Script for exposing native features while keeping isolation
      preload: 'src/preload.js',
      // Fix bug where fonts are requested with incorrect path
      // https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/1647#issuecomment-1019400838
      customFileProtocol: './'
    }
  }
}
