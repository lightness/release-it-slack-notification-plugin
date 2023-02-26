export const getPluginConfig = (options) => {
  const indexPluginConfig = options.plugins['./index.js'];
  const prodPluginConfig = options.plugins['@lightness/release-it-slack-notification-plugin'];

  return prodPluginConfig || indexPluginConfig;
}