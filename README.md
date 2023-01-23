# Plugin for release-it to notify about release in slack

This [release-it plugin](https://github.com/release-it/release-it/blob/master/docs/plugins.md) ...

```
npm install --save-dev @lightness/release-it-slack-notification-plugin
```

In [release-it](https://github.com/release-it/release-it) config:

```
"plugins": {
  "@lightness/release-it-slack-notification-plugin": {
    "slackBotTokenRef": "SLACK_BOT_TOKEN",
    "slackChannelRef": "SLACK_CHANNEL",
    "slackMessageTitle": "New release",
  }
}
```
