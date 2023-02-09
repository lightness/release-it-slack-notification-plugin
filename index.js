import { Plugin } from 'release-it';
import fetch from 'node-fetch';
import slackify from 'slackify-markdown';
import { default as prompts } from './prompts.js';
import SlackBolt from '@slack/bolt';

const { App } = SlackBolt;

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

  get slackSigningSecretRef() {
    const { slackSigningSecretRef = 'SLACK_SIGNING_SECRET' } = this.options;

    return slackSigningSecretRef;
  }

  get slackSigningSecret() {
    return process.env[this.slackSigningSecretRef];
  }

  get slackAppTokenRef() {
    const { slackAppTokenRef = 'SLACK_APP_TOKEN' } = this.options;

    return slackAppTokenRef;
  }

  get slackAppToken() {
    return process.env[this.slackAppTokenRef];
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

    // TODO: Check other stuff

    if (!this.slackChannel) {
      this.log.log(`Slack channel is not set. Use "${this.slackChannelRef}" env var for that`);

      return;
    }

    const app = new App({
      token: this.slackBotToken,
      signingSecret: this.slackSigningSecret,
      appToken: this.slackAppToken,
      socketMode: true,
    });

    app.action('approve_button', async ({ payload, body, ack, say, respond }) => {
      await ack();
      await say({
        text: 'Approve handled :clap:',
        thread_ts: body.message.thread_ts || body.message.ts,
      });
    });

    app.action('reject_button', async ({ payload, body, ack, say, respond }) => {
      await ack();
      await say({
        text: 'Reject handled :clap:',
        thread_ts: body.message.thread_ts || body.message.ts,
      });
    });

    await app.start();
    console.log('⚡️ Bolt app started');

    const response = await app.client.chat.postMessage({
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
        {
          type: 'actions',
          elements: [
            {
              action_id: 'approve_button',
              type: 'button',
              style: 'primary',
              text: {
                type: 'plain_text',
                text: ':thumbsup: Approve',
                emoji: true,
              },
              value: '1',
            },
            {
              action_id: 'reject_button',
              type: 'button',
              style: 'danger',
              text: {
                type: 'plain_text',
                text: ':no_entry: Reject',
                emoji: true,
              },
              value: '0',
            },
          ],
        },
      ],
      username: this.slackUsername,
      icon_emoji: this.slackIconEmoji,
    });

    this.log.log('>>> response', response);

    this.log.log(`Notification sent in ${this.slackChannel} slack channel`);
  }
}

export default SlackNotificationPlugin;
