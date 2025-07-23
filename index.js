import { execSync } from "child_process";
import { Plugin } from "release-it";
import SlackBolt from "@slack/bolt";
import slackify from "slackify-markdown";
import { Mode } from "./constants.js";
import { createPr, getAllBranches } from "./bitbucket-api.js";

const { App } = SlackBolt;

class SlackNotificationPlugin extends Plugin {
  constructor(...args) {
    super(...args);
    this.registerPrompts(this.prompts);
  }

  async getPossibleSourceBranches() {
    const allBranchesResponse = await getAllBranches(this.bitbucketCredentials);
    const allBranchNames = allBranchesResponse.values.map(
      (value) => value.name
    );

    return allBranchNames.filter(
      (name) => name !== this.sourceBranch && name !== this.destinationBranch
    );
  }

  get prompts() {
    return {
      sendSlackNotification: {
        type: "confirm",
        message: () => {
          return `Send notification in slack channel?`;
        },
        default: true,
      },
      sendSlackConfirmation: {
        type: "confirm",
        message: () => {
          return `Send confirmation in slack channel?`;
        },
        default: true,
      },
      selectUsersToConfirm: {
        type: "checkbox",
        default: [],
        message: () => {
          return "Select slack users to confirm release:";
        },
        choices: () => {
          return Object.keys(this.options.slackUser);
        },
        validate: (input) => {
          return input.length > 0;
        },
      },
      confirmHotfix: {
        type: "confirm",
        message: () =>
          `⚠️ You're not on '${this.sourceBranch}'. Are you sure you want to perform a hotfix?`,
        default: false,
      },
    };
  }

  async afterRelease() {
    switch (this.mode) {
      case Mode.BB_PR_NOTIFICATION:
        const prLink = await this.createBitbucketPr(this.currentBranchName);

        await this.step({
          enabled: true,
          prompt: "sendSlackNotification",
          task: () => this.notifyInSlack({ prLink }),
          label: "Send slack notification",
        });
        break;
    }
  }

  async beforeRelease() {
    switch (this.mode) {
      case Mode.NOTIFICATION:
        await this.step({
          enabled: true,
          prompt: "sendSlackNotification",
          task: () => this.notifyInSlack(),
          label: "Send slack notification",
        });

        break;
      case Mode.CONFIRMATION:
        await this.step({
          enabled: true,
          prompt: "sendSlackConfirmation",
          task: () => this.confirmInSlack(),
          label: "Send slack confirmation",
        });

        break;
      case Mode.BB_PR_NOTIFICATION:
        await this.validateCurrentBranch();

        break;
    }
  }

  get currentBranchName() {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  }

  async validateCurrentBranch() {
    const { currentBranchName } = this;

    if (currentBranchName === this.destinationBranch) {
      throw new Error(`Switch to '${this.sourceBranch}' for release`);
    }

    if (currentBranchName !== this.sourceBranch) {
      let isConfirmed;

      await this.step({
        enabled: true,
        prompt: "confirmHotfix",
        task: (answer) => {
          isConfirmed = answer;
        },
      });

      if (!isConfirmed) {
        throw new Error(`Switch to '${this.sourceBranch}' for release`);
      }
    }
  }

  get slackUsers() {
    const { slackUser = {} } = this.options;

    return Object.entries(slackUser).map(([key, value]) => ({
      name: key,
      code: value,
    }));
  }

  get mode() {
    const { mode = Mode.NOTIFICATION } = this.options;

    return mode;
  }

  get slackBotTokenRef() {
    const { slackBotTokenRef = "SLACK_BOT_TOKEN" } = this.options;

    return slackBotTokenRef;
  }

  get slackBotToken() {
    return process.env[this.slackBotTokenRef];
  }

  get slackSigningSecretRef() {
    const { slackSigningSecretRef = "SLACK_SIGNING_SECRET" } = this.options;

    return slackSigningSecretRef;
  }

  get slackSigningSecret() {
    return process.env[this.slackSigningSecretRef];
  }

  get slackAppTokenRef() {
    const { slackAppTokenRef = "SLACK_APP_TOKEN" } = this.options;

    return slackAppTokenRef;
  }

  get slackAppToken() {
    return process.env[this.slackAppTokenRef];
  }

  get slackChannelRef() {
    const { slackChannelRef = "SLACK_CHANNEL" } = this.options;

    return slackChannelRef;
  }

  get slackChannel() {
    return process.env[this.slackChannelRef];
  }

  get slackMessageTitle() {
    const { slackMessageTitle = "New release" } = this.options;

    return slackMessageTitle;
  }

  get slackUsername() {
    const { slackUsername = "release-it" } = this.options;

    return slackUsername;
  }

  get slackIconEmoji() {
    const { slackIconEmoji = ":robot_face:" } = this.options;

    return slackIconEmoji;
  }

  // Bitbucket credentials (BEGIN)

  get destinationBranch() {
    const { destinationBranch = "main" } = this.options;

    return destinationBranch;
  }

  get sourceBranch() {
    const { sourceBranch = "develop" } = this.options;

    return sourceBranch;
  }

  get bitbucketCredentials() {
    return {
      workspace: this.bitbucketWorkspace,
      repoSlug: this.bitbucketRepoSlug,
      token: this.bitbucketToken,
    };
  }

  get bitbucketWorkspaceRef() {
    const { bitbucketWorkspaceRef = "BITBUCKET_WORKSPACE" } = this.options;

    return bitbucketWorkspaceRef;
  }

  get bitbucketWorkspace() {
    return process.env[this.bitbucketWorkspaceRef];
  }

  get bitbucketRepoSlugRef() {
    const { bitbucketRepoSlugRef = "BITBUCKET_REPO_SLUG" } = this.options;

    return bitbucketRepoSlugRef;
  }

  get bitbucketRepoSlug() {
    return process.env[this.bitbucketRepoSlugRef];
  }

  get bitbucketTokenRef() {
    const { bitbucketTokenRef = "BITBUCKET_TOKEN" } = this.options;

    return bitbucketTokenRef;
  }

  get bitbucketToken() {
    return process.env[this.bitbucketTokenRef];
  }

  // Bitbucket credentials (END)

  get boltApp() {
    return new App({
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
  }

  async createBitbucketPr(sourceBranch) {
    const isHotfix = this.currentBranchName !== this.sourceBranch;
    const newVersion = this.config.contextOptions.version;

    const title = isHotfix
      ? `:fire: Hotfix v${newVersion}`
      : `:rocket: Release v${newVersion}`;

    const response = await createPr(this.bitbucketCredentials, {
      sourceBranch,
      destinationBranch: this.destinationBranch,
      title,
      summary: this.config.getContext("changelog"),
    });

    this.writeLog(`PR created: ${response?.links?.html?.href}`);

    return response?.links?.html?.href;
  }

  async notifyInSlack(options) {
    const { boltApp: app } = this;

    const { mainBlocks, otherBlocksList } =
      this.composeNotificationBlocks(options);

    const response = await app.client.chat.postMessage({
      channel: this.slackChannel,
      username: this.slackUsername,
      icon_emoji: this.slackIconEmoji,
      blocks: mainBlocks,
    });

    for (const otherBlocks of otherBlocksList || []) {
      await app.client.chat.postMessage({
        channel: this.slackChannel,
        thread_ts: response.message.ts,
        username: this.slackUsername,
        icon_emoji: this.slackIconEmoji,
        blocks: otherBlocks,
      });
    }

    this.log.log(`Notification sent in ${this.slackChannel} slack channel`);
  }

  splitMarkdownByParts(changelogText) {
    return changelogText
      .split("\n")
      .filter((x) => x)
      .reduce((parts, cur) => {
        if (cur.startsWith("###")) {
          parts.push("");
        }

        parts[parts.length - 1] = `${parts[parts.length - 1]}${cur}\n`;

        return parts;
      }, []);
  }

  splitMarkdownByLines(changelogText) {
    return changelogText.split("\n");
  }

  groupLines(lines) {
    const { finished, current } = lines.reduce(
      (acc, line) => {
        const { finished, current } = acc;

        if (slackify([...current, line].join("\n")).length > 3000) {
          return { finished: [...finished, current], current: [line] };
        } else {
          return { finished, current: [...current, line] };
        }
      },
      { finished: [], current: [] }
    );

    return [...finished, current].map((x) => x.join("\n"));
  }

  getChangelogSections(changelogText) {
    return this.splitMarkdownByParts(changelogText).flatMap((part) => {
      const lines = this.splitMarkdownByLines(part);
      const groups = this.groupLines(lines);

      return groups.map((groupItem) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: slackify(groupItem),
        },
      }));
    });
  }

  chargebeePlaceholderSections() {
    return [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "See changelog in thread",
        },
      },
    ];
  }

  composeNotificationBlocks({ prLink }) {
    const changelogText = this.config.getContext("changelog");

    const sections = this.getChangelogSections(changelogText);

    const goToPrBlock = prLink
      ? [
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "➡ Pull Request",
                  emoji: true,
                },
                url: prLink,
              },
            ],
          },
        ]
      : [];

    const mainBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "`" + this.slackMessageTitle + "`",
        },
      },
      ...(sections.length <= 47 ? sections : this.changelogPlaceholderSections),
      ...goToPrBlock,
    ];

    const otherBlocksList =
      sections.length > 47 ? chunkArray(sections, 50) : [];

    return { mainBlocks, otherBlocksList };
  }

  composeConfirmationBlocks(slackUserIds) {
    const changelogText = this.config.getContext("changelog");

    const sections = this.getChangelogSections(changelogText);

    const mainBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "`" + this.slackMessageTitle + "`",
        },
      },
      ...(sections.length <= 45 ? sections : this.changelogPlaceholderSections),
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: slackUserIds.map((userId) => `<@${userId}>`).join(),
        },
      },
      {
        type: "divider",
      },
      {
        type: "actions",
        elements: [
          {
            action_id: "approve_button",
            type: "button",
            style: "primary",
            text: {
              type: "plain_text",
              text: ":thumbsup: Approve",
              emoji: true,
            },
            value: "1",
          },
          {
            action_id: "reject_button",
            type: "button",
            style: "danger",
            text: {
              type: "plain_text",
              text: ":no_entry: Reject",
              emoji: true,
            },
            value: "0",
          },
        ],
      },
    ];

    const otherBlocksList = sections > 45 ? chunkArray(sections, 50) : [];

    return { mainBlocks, otherBlocksList };
  }

  init() {
    if (!this.slackBotToken) {
      throw new Error(
        `Slack bot token is not set. Use "${this.slackBotTokenRef}" env var for that`
      );
    }

    if (!this.slackChannel) {
      throw new Error(
        `Slack channel is not set. Use "${this.slackChannelRef}" env var for that`
      );
    }

    if (this.mode === Mode.CONFIRMATION) {
      if (this.slackUsers.length === 0) {
        throw new Error(
          `Slack users is not set. Use "slackUser" option in plugin config`
        );
      }
    }
  }

  async confirmInSlack() {
    let slackUserIds = [];

    if (this.slackUsers.length > 0) {
      if (this.isInteractiveMode) {
        await this.step({
          enabled: true,
          prompt: "selectUsersToConfirm",
          task: (names) => {
            slackUserIds = names.map((name) => this.options.slackUser[name]);
          },
          label: "Select user to confirm",
        });
      } else {
        slackUserIds = Object.values(this.options.slackUser);
      }
    }

    const { boltApp: app } = this;

    await new Promise(async (resolve, reject) => {
      let messageTs;

      app.action(
        "approve_button",
        async ({ payload, body, ack, say, respond }) => {
          if (body.message.ts !== messageTs) {
            return;
          }

          await ack();

          if (slackUserIds.includes(body.user.id)) {
            await say({
              text: `:thumbsup: Thanks for your approve, <@${body.user.id}>!`,
              thread_ts: body.message.thread_ts || body.message.ts,
            });

            this.writeLog("Release approved!");

            resolve();
          } else {
            await say({
              text: `:warning: <@${body.user.id}>! You can not approve this release.`,
              thread_ts: body.message.thread_ts || body.message.ts,
            });
          }
        }
      );

      app.action(
        "reject_button",
        async ({ payload, body, ack, say, respond }) => {
          if (body.message.ts !== messageTs) {
            return;
          }

          await ack();

          if (slackUserIds.includes(body.user.id)) {
            await say({
              text: `:thumbsdown: Release rejected by <@${body.user.id}>!`,
              thread_ts: body.message.thread_ts || body.message.ts,
            });

            this.log.error("Release rejected!");

            reject();
          } else {
            await say({
              text: `:warning: <@${body.user.id}>! You can not reject this release.`,
              thread_ts: body.message.thread_ts || body.message.ts,
            });
          }
        }
      );

      await app.start();
      this.writeLog("⚡️ Bolt app started");

      const { mainBlocks, otherBlocksList } =
        this.composeConfirmationBlocks(slackUserIds);

      const response = await app.client.chat.postMessage({
        channel: this.slackChannel,
        username: this.slackUsername,
        icon_emoji: this.slackIconEmoji,
        blocks: mainBlocks,
      });

      messageTs = response.message.ts;

      for (const otherBlocks of otherBlocksList || []) {
        await app.client.chat.postMessage({
          channel: this.slackChannel,
          thread_ts: messageTs,
          username: this.slackUsername,
          icon_emoji: this.slackIconEmoji,
          blocks: otherBlocks,
        });
      }

      this.writeLog(`Notification sent in ${this.slackChannel} slack channel`);
    });

    app.stop();
    this.writeLog("⚡️ Bolt app stopped");
  }

  get isInteractiveMode() {
    return !this.config.isCI && !this.config.isPromptOnlyVersion;
  }

  writeLog(message) {
    if (this.isInteractiveMode) {
      this.log.log(message);
    }
  }
}

export default SlackNotificationPlugin;

function chunkArray(array, chunkSize) {
  var results = [];

  while (array.length) {
    results.push(array.splice(0, chunkSize));
  }

  return results;
}
