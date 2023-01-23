import { Plugin } from 'release-it';
import fetch from 'node-fetch';
import slackify from 'slackify-markdown';

const SLACK_URL = 'https://slack.com/api/chat.postMessage';

class SlackNotificationPlugin extends Plugin {
  async beforeRelease() {
    const changelog = this.config.getContext('changelog');

    await this.notifyInSlack(changelog);
  }

  get slackBotToken() {
    const { slackBotTokenRef = 'SLACK_BOT_TOKEN' } = this.options;

    return process.env[slackBotTokenRef];
  }

  get slackChannel() {
    const { slackChannelRef = 'SLACK_CHANNEL' } = this.options;

    return process.env[slackChannelRef];
  }

  get slackMessageTitle() {
    const { slackMessageTitle = 'New release' } = this.options;

    return slackMessageTitle;
  }

  async notifyInSlack(text) {
    await fetch(SLACK_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: this.slackChannel,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: this.slackMessageTitle,
            }
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: slackify(text),
            },
          },
        ],
      }),
    });

    this.log.log(`Sent notification in ${this.slackChannel} slack channel`);
  }
}

export default SlackNotificationPlugin;
