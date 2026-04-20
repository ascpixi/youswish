import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline/promises';
import chalk from 'chalk';

export interface Config {
  airtableToken: string;
  slackToken: string;
  slackWorkspace: string;
}

const CONFIG_PATH = join(homedir(), '.youswish.json');

async function prompt(question: string, obscure = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (obscure) {
    const { emitKeypressEvents } = await import('readline');
    emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    return new Promise(resolve => {
      process.stdout.write(question);
      let value = '';
      process.stdin.on('keypress', function handler(_, key) {
        if (key.name === 'return' || key.name === 'enter') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('keypress', handler);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (key.name === 'backspace') {
          value = value.slice(0, -1);
        } else if (!key.ctrl && key.sequence) {
          value += key.sequence;
        }
      });
    });
  }

  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function saveConfig(patch: Partial<Record<string, unknown>>): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(CONFIG_PATH)) {
    try {
      existing = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      // overwrite malformed file
    }
  }
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...patch }, null, 2) + '\n', 'utf-8');
}

async function ensureString(
  raw: Record<string, unknown>,
  key: string,
  promptText: string,
  hint?: string,
  obscure = false
): Promise<string> {
  if (typeof raw[key] === 'string' && raw[key]) return raw[key] as string;

  if (hint) console.log(hint);
  const value = await prompt(chalk.bold(promptText), obscure);
  if (!value) {
    console.error(chalk.red(`${key} is required.`));
    process.exit(1);
  }

  raw[key] = value;
  saveConfig({ [key]: value });
  console.log(chalk.green(`Saved to ${CONFIG_PATH}\n`));
  return value;
}

export async function loadConfig(): Promise<Config> {
  let raw: Record<string, unknown> = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      console.warn(chalk.yellow(`Warning: ${CONFIG_PATH} contains invalid JSON — starting fresh.`));
    }
  }

  const airtableToken = await ensureString(
    raw, 'airtableToken', 'Airtable personal access token: ',
    `No Airtable token found in ${CONFIG_PATH}.\n` +
    `Create one at ${chalk.cyan('https://airtable.com/create/tokens')} with ` +
    `${chalk.bold('data.records:read')} scope on the YSWS Projects base.\n`,
    true
  );

  return { airtableToken, slackToken: raw.slackToken as string ?? '', slackWorkspace: raw.slackWorkspace as string ?? '' };
}

export async function loadSlackConfig(): Promise<Pick<Config, 'slackToken' | 'slackWorkspace'>> {
  let raw: Record<string, unknown> = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      console.warn(chalk.yellow(`Warning: ${CONFIG_PATH} contains invalid JSON — starting fresh.`));
    }
  }

  const slackToken = await ensureString(
    raw, 'slackToken', 'Slack bot/user token: ',
    `No Slack token found in ${CONFIG_PATH}.\n` +
    `Create a Slack app or use an existing token with the ${chalk.bold('users:read.email')} scope.\n`,
    true
  );

  const slackWorkspace = await ensureString(
    raw, 'slackWorkspace', 'Slack workspace subdomain (e.g. hackclub): ',
    `No Slack workspace configured in ${CONFIG_PATH}.\n`
  );

  return { slackToken, slackWorkspace };
}
