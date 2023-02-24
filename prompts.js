export default {
  sendSlackNotification: {
    type: 'confirm',
    message: () => {
      return `Send notification in slack channel?`;
    },
    default: true,
  },
  sendSlackConfirmation: {
    type: 'confirm',
    message: () => {
      return `Send confirmation in slack channel?`;
    },
    default: true,
  },
  selectUserToConfirm: {
    type: 'checkbox',
    default: [],
    choices: (options) => {
      console.log('>>> options', options);
      return [];
    }
  }
};
