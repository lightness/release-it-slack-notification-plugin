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
  selectUsersToConfirm: {
    type: 'checkbox',
    default: [],
    message: () => {
      return 'Select slack users to confirm release:';
    },
    choices: (options) => {
      console.log('>>> options', options);
      return [];
    }
  }
};
