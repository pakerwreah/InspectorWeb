module.exports = {
  publicPath: './',
  transpileDependencies: ['vuetify'],
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
      mainProcessWatch: ['src/native/*']
    }
  }
}
