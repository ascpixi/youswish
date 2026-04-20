import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export interface Config {
  airtableToken: string;
}

const CONFIG_PATH = join(homedir(), '.youswish.json');

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`No config found at ${CONFIG_PATH}`);
    console.error('Create it with:');
    console.error('  { "airtableToken": "your_airtable_personal_access_token" }');
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    console.error(`Failed to parse ${CONFIG_PATH} — must be valid JSON.`);
    process.exit(1);
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.airtableToken !== 'string' || !config.airtableToken) {
    console.error(`${CONFIG_PATH} must contain an "airtableToken" string.`);
    process.exit(1);
  }

  return { airtableToken: config.airtableToken };
}
