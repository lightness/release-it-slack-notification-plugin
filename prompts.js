export default {
  sendSlackNotification: {
    type: 'confirm',
    message: context => `Send notification to ${JSON.stringify(context)} slack channel`,
    default: true,
  },
};
