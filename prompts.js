import { getPluginConfig } from './util.js';

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
      const config = getPluginConfig(options);

      return Object.keys(config.slackUser);
    },
    validate: (input) => {
      console.log('>>> input', input);

      return input.length > 0;
    },
  }
};
