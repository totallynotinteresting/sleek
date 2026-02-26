const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

async function findSlackPaths() {
    let slackPath = process.env.SLACK_PATH;

    if (!slackPath) {
        const searchPaths = isMac ? [
            '/Applications/Slack.app',
            path.join(os.homedir(), 'Applications/Slack.app'),
            path.join(os.homedir(), 'Downloads/Slack.app')
        ] : [
            '/usr/bin/slack',
            '/usr/lib/slack',
            '/opt/slack/slack',
            path.join(os.homedir(), '.local/bin/slack')
        ];

        for (const p of searchPaths) {
            if (await fs.pathExists(p)) {
                slackPath = p;
                break;
            }
        }
    }

    if (!slackPath) {
        throw new Error('sleek | couldnt find slack, try setting the SLACK_PATH env var');
    }

    let resourcesPath, executablePath;

    if (isMac) {
        resourcesPath = path.join(slackPath, 'Contents/Resources');
        executablePath = path.join(slackPath, 'Contents/MacOS/Slack');
    } else {
        const possibleResources = path.join(path.dirname(slackPath), 'resources');
        if (await fs.pathExists(possibleResources)) {
            resourcesPath = possibleResources;
        } else {
            resourcesPath = path.join(slackPath, 'resources');
        }
        executablePath = slackPath;
    }

    return {
        root: slackPath,
        resources: resourcesPath,
        executable: executablePath,
        mainAsar: path.join(resourcesPath, 'app.asar'),
        armAsar: path.join(resourcesPath, 'app-arm64.asar')
    };
}

function getUserDataPath() {
    if (isMac) {
        return path.join(os.homedir(), 'Library/Application Support/Slack');
    }
    return path.join(os.homedir(), '.config/Slack');
}
module.exports = {
    findSlackPaths,
    getUserDataPath,
    isMac,
    isLinux
};
