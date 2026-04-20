import chalk from 'chalk';
import { loadSlackConfig } from '../config.js';

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    display_name: string;
    real_name: string;
    email: string;
  };
  deleted: boolean;
}

async function lookupByEmail(token: string, email: string): Promise<SlackUser | null> {
  const url = new URL('https://slack.com/api/users.lookupByEmail');
  url.searchParams.set('email', email);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Slack API HTTP error ${res.status}`);

  const data = await res.json() as { ok: boolean; user?: SlackUser; error?: string };
  if (!data.ok) {
    if (data.error === 'users_not_found') return null;
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data.user ?? null;
}

export async function slackCommand(emails: string[]): Promise<void> {
  const { slackToken, slackWorkspace } = await loadSlackConfig();

  for (const email of emails) {
    let user: SlackUser | null;
    try {
      user = await lookupByEmail(slackToken, email);
    } catch (err) {
      console.error(chalk.red(`Error looking up ${email}: ${err instanceof Error ? err.message : String(err)}`));
      continue;
    }

    if (!user) {
      console.log(`${chalk.yellow('?')} ${chalk.bold(email)} — not found in workspace`);
      continue;
    }

    const profileUrl = `https://${slackWorkspace}.slack.com/team/${user.id}`;
    const displayName = user.profile.display_name || user.profile.real_name || user.real_name || user.name;

    console.log(`${chalk.green('✓')} ${chalk.bold(email)}`);
    console.log(`  ${chalk.bold('ID:')}           ${user.id}`);
    console.log(`  ${chalk.bold('Name:')}         ${displayName}`);
    console.log(`  ${chalk.bold('Profile URL:')}  ${chalk.blue(profileUrl)}`);
    if (user.deleted) console.log(`  ${chalk.yellow('(deactivated account)')}`);
    console.log('');
  }
}
