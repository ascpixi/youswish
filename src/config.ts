import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import { prompt } from './prompt.js';

export interface GrantTemplate {
  inviteMessage: string;
  purpose: string;
  instructions: string;
  lifetimeDays: number;
  dollarsPerHour: number;
}

export interface Config {
  airtableToken: string;
  slackToken: string;
  hcbToken: string;
  hcbOrganizationId: string;
  grantTemplates: Record<string, GrantTemplate>;
}

export const CONFIG_PATH = join(homedir(), '.youswish.json');

export function readRawConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    console.warn(chalk.yellow(`Warning: ${CONFIG_PATH} contains invalid JSON — starting fresh.`));
    return {};
  }
}

export function saveConfig(patch: Record<string, unknown>): void {
  const existing = readRawConfig();
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...patch }, null, 2) + '\n', 'utf-8');
}

export function deleteConfigKeys(...keys: string[]): void {
  const existing = readRawConfig();
  for (const k of keys) delete existing[k];
  writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

async function ensureString(
  raw: Record<string, unknown>,
  key: string,
  question: string,
  hint?: string,
  obscure = false
): Promise<string> {
  if (typeof raw[key] === 'string' && raw[key]) return raw[key] as string;

  if (hint) process.stdout.write(hint);
  const value = await prompt(chalk.bold(question), obscure);
  if (!value) {
    console.error(chalk.red(`${key} is required.`));
    process.exit(1);
  }

  raw[key] = value;
  saveConfig({ [key]: value });
  console.log(chalk.green(`Saved to ${CONFIG_PATH}\n`));
  return value;
}

export async function loadConfig(): Promise<Pick<Config, 'airtableToken'>> {
  const raw = readRawConfig();
  const airtableToken = await ensureString(
    raw, 'airtableToken', 'Airtable personal access token: ',
    `No Airtable token found in ${CONFIG_PATH}.\n` +
    `Create one at ${chalk.cyan('https://airtable.com/create/tokens')} with ` +
    `${chalk.bold('data.records:read')} scope on the YSWS Projects base.\n\n`,
    true
  );
  return { airtableToken };
}

export async function loadSlackConfig(): Promise<Pick<Config, 'slackToken'> & { slackWorkspace: string }> {
  const raw = readRawConfig();
  const slackToken = await ensureString(
    raw, 'slackToken', 'Slack bot/user token: ',
    `No Slack token found in ${CONFIG_PATH}.\n` +
    `Create a Slack app or use an existing token with the ${chalk.bold('users:read.email')} scope.\n\n`,
    true
  );
  return { slackToken, slackWorkspace: 'hackclub.enterprise' };
}

export async function loadHcbConfig(): Promise<Pick<Config, 'hcbToken' | 'hcbOrganizationId'>> {
  const raw = readRawConfig();
  const hcbToken = await ensureString(
    raw, 'hcbToken', 'HCB token (hcb_...): ',
    `No HCB token found in ${CONFIG_PATH}.\n` +
    `Create one at ${chalk.cyan('https://hcb.hackclub.com/api/v4/oauth/authorize')} ` +
    `with the ${chalk.bold('card_grants:write')} scope.\n\n`,
    true
  );
  const hcbOrganizationId = await ensureString(
    raw, 'hcbOrganizationId', 'HCB organization ID or slug: ',
    `No HCB organization configured in ${CONFIG_PATH}.\n\n`
  );
  return { hcbToken, hcbOrganizationId };
}

export function loadGrantTemplates(): Record<string, GrantTemplate> {
  const raw = readRawConfig();
  return (raw.grantTemplates as Record<string, GrantTemplate>) ?? {};
}
