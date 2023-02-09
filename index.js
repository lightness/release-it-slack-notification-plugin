import { Plugin } from 'release-it';
import fetch from 'node-fetch';
import slackify from 'slackify-markdown';
import { default as prompts } from './prompts.js';

const SLACK_URL = 'https://slack.com/api/chat.postMessage';

class SlackNotificationPlugin extends Plugin {

  constructor(...args) {
    super(...args);
    this.registerPrompts(prompts);
  }

  async beforeRelease() {
    const changelog = this.config.getContext('changelog');

    await this.step({
      enabled: true,
      prompt: 'sendSlackNotification',
      task: () => this.notifyInSlack(changelog),
      label: 'Send slack notification',
    })
  }

  get slackBotTokenRef() {
    const { slackBotTokenRef = 'SLACK_BOT_TOKEN' } = this.options;

    return slackBotTokenRef;
  }

  get slackBotToken() {
    return process.env[this.slackBotTokenRef];
  }

  get slackChannelRef() {
    const { slackChannelRef = 'SLACK_CHANNEL' } = this.options;

    return slackChannelRef;
  }

  get slackChannel() {
    return process.env[this.slackChannelRef];
  }

  get slackMessageTitle() {
    const { slackMessageTitle = 'New release' } = this.options;

    return slackMessageTitle;
  }

  get slackUsername() {
    const { slackUsername = 'release-it' } = this.options;

    return slackUsername;
  }

  get slackIconEmoji() {
    const { slackIconEmoji = ':robot_face:' } = this.options;

    return slackIconEmoji;
  }

  async notifyInSlack(text) {
    if (!this.slackBotToken) {
      this.log.log(`Slack bot token is not set. Use "${this.slackBotTokenRef}" env var for that`);

      return;
    }

    if (!this.slackChannel) {
      this.log.log(`Slack channel is not set. Use "${this.slackChannelRef}" env var for that`);

      return;
    }

    const response = await fetch(SLACK_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: this.slackChannel,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '`' + this.slackMessageTitle + '`',
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: slackify(text),
            },
          },
        ],
        username: this.slackUsername,
				icon_emoji: this.slackIconEmoji,
      }),
    });

    this.log.log('>>> response', response);

    this.log.log(`Notification sent in ${this.slackChannel} slack channel`);
  }
}

export default SlackNotificationPlugin;
