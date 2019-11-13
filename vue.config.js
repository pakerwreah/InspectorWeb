module.exports = {
  transpileDependencies: ['vuetify'],
  chainWebpack (config) {
    config.plugin('define').tap(args => {
      args[0]['process.env']['VERSION'] = JSON.stringify(require('./package.json').version)
      return args
    })
  }
}
