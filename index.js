import { Plugin } from 'release-it';
import fetch from 'node-fetch';
import slackify from 'slackify-markdown';

const SLACK_URL = 'https://slack.com/api/chat.postMessage';

class SlackNotificationPlugin extends Plugin {
  async beforeRelease() {
    const changelog = this.config.getContext('changelog');

    await this.notifyInSlack(changelog);
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

  async notifyInSlack(text) {
    if (!this.slackBotToken) {
      this.log.log(`Slack bot token is not set. Use "${this.slackBotTokenRef}" env var for that`);

      return;
    }

    if (!this.slackChannel) {
      this.log.log(`Slack channel is not set. Use "${this.slackChannelRef}" env var for that`);

      return;
    }

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
