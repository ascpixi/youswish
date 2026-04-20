import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline/promises';
import chalk from 'chalk';

export interface Config {
  airtableToken: string;
}

const CONFIG_PATH = join(homedir(), '.youswish.json');

async function prompt(question: string, obscure = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (obscure) {
    // Suppress echoed characters for sensitive input
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

function saveConfig(config: Partial<Config>): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(CONFIG_PATH)) {
    try {
      existing = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      // overwrite malformed file
    }
  }
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...config }, null, 2) + '\n', 'utf-8');
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

  if (typeof raw.airtableToken !== 'string' || !raw.airtableToken) {
    console.log(chalk.dim(`No Airtable token found in ${CONFIG_PATH}.`));
    console.log(`Create a personal access token at ${chalk.cyan('https://airtable.com/create/tokens')} with`);
    console.log(`${chalk.bold('data.records:read')} scope on the YSWS Projects base.\n`);

    const token = await prompt(chalk.bold('Airtable personal access token: '), true);
    if (!token) {
      console.error(chalk.red('Token is required.'));
      process.exit(1);
    }

    raw.airtableToken = token;
    saveConfig({ airtableToken: token });
    console.log(chalk.green(`Saved to ${CONFIG_PATH}\n`));
  }

  return { airtableToken: raw.airtableToken as string };
}
