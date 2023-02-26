import { Plugin } from 'release-it';
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

    switch (this.mode) {
      case 'notification':
        await this.step({
          enabled: true,
          prompt: 'sendSlackNotification',
          task: () => this.notifyInSlack(changelog),
          label: 'Send slack notification',
        });
        break;
      case 'confirmation':
        await this.step({
          enabled: true,
          prompt: 'sendSlackConfirmation',
          task: () => this.confirmInSlack(changelog),
          label: 'Send slack confirmation',
        });
        break;
    }
    
  }

  get slackUsers() {
    const { slackUser = {} } = this.options;

    return Object.entries(slackUser).map(([key, value]) => ({ name: key, code: value }));
  }

  get mode() {
    const { mode = 'notification' } = this.options;

    return mode;
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

    if (!this.slackChannel) {
      this.log.log(`Slack channel is not set. Use "${this.slackChannelRef}" env var for that`);

      return;
    }

    const message = this.composeNotificationMessage(text);

    this.log.log(`Notification sent in ${this.slackChannel} slack channel`);
  }

  composeNotificationMessage(text) {
    return {
      channel: this.slackChannel,
      username: this.slackUsername,
      icon_emoji: this.slackIconEmoji,
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
      ]
    };
  }

  composeConfirmationMessage(text, slackUserIds) {
    return {
      channel: this.slackChannel,
      username: this.slackUsername,
      icon_emoji: this.slackIconEmoji,
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
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: slackUserIds.map(userId => `<@${userId}>`).join(),
          },
        },
        {
          type: 'divider',
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
      ]
    };
  }

  async confirmInSlack(text) {
    if (!this.slackBotToken) {
      this.log.log(`Slack bot token is not set. Use "${this.slackBotTokenRef}" env var for that`);

      return;
    }

    if (!this.slackChannel) {
      this.log.log(`Slack channel is not set. Use "${this.slackChannelRef}" env var for that`);

      return;
    }

    if (this.slackUsers.length === 0) {
      this.log.log(`Slack users is not set. Use "slackUser" option in plugin config`);

      return;
    }

    let slackUserIds = [];

    if (this.slackUsers.length > 0) {
      await this.step({
        enabled: true,
        prompt: 'selectUsersToConfirm',
        task: (names) => {
          slackUserIds = names.map(name => this.options.slackUser[name]);
        },
        label: 'Select user to confirm',
      })
    }

    const app = new App({
      token: this.slackBotToken,
      signingSecret: this.slackSigningSecret,
      appToken: this.slackAppToken,
      socketMode: true,
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        setLevel: () => {},
        getLevel: () => {},
        setName: () => {},
      },
    });

    await new Promise(async (resolve, reject) => {
      let messageTs; 

      app.action('approve_button', async ({ payload, body, ack, say, respond }) => {
        if (body.message.ts !== messageTs) {
          return;
        }

        await ack();

        if (slackUserIds.includes(body.user.id)) {
          await say({
            text: `:thumbsup: Thanks for your approve, <@${body.user.id}>!`,
            thread_ts: body.message.thread_ts || body.message.ts,
          });
  
          this.log.log('Release approved!');

          resolve();
        } else {
          await say({
            text: `:warning: <@${body.user.id}>! You can not approve this release.`,
            thread_ts: body.message.thread_ts || body.message.ts,
          });
        }
      });
  
      app.action('reject_button', async ({ payload, body, ack, say, respond }) => {
        if (body.message.ts !== messageTs) {
          return;
        }

        await ack();

        if (slackUserIds.includes(body.user.id)) {
          await say({
            text: `:thumbsdown: Release rejected by <@${body.user.id}>!`,
            thread_ts: body.message.thread_ts || body.message.ts,
          });

          this.log.log('Release rejected!');

          reject();
        } else {
          await say({
            text: `:warning: <@${body.user.id}>! You can not reject this release.`,
            thread_ts: body.message.thread_ts || body.message.ts,
          });
        }
      });
  
      await app.start();
      this.log.log('⚡️ Bolt app started');
  
      const message = this.composeConfirmationMessage(text, slackUserIds);
      const response = await app.client.chat.postMessage(message);
  
      // this.log.log('>>> response', response);
      messageTs = response.message.ts;
  
      this.log.log(`Notification sent in ${this.slackChannel} slack channel`);
    });

    app.stop();
    this.log.log('⚡️ Bolt app stopped');
  }
}

export default SlackNotificationPlugin;
