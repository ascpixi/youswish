import chalk from 'chalk';
import { readRawConfig, saveConfig, CONFIG_PATH } from '../../config.js';
import { getCurrentUser, getOrganization, HCB_WEB } from '../../hcb.js';
import { prompt, promptRequired } from '../../prompt.js';

export async function hcbLoginCommand(): Promise<void> {
  const raw = readRawConfig();
  const existing = typeof raw.hcbToken === 'string' && raw.hcbToken;

  if (existing) {
    const reauth = await prompt(chalk.yellow('Already logged in. Re-authenticate? (y/N) '));
    if (reauth.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log(`\nGet your HCB token at ${chalk.cyan(`${HCB_WEB}/api/v4/oauth/authorize`)}`);
  console.log(`or via your HCB account settings. Token requires the ${chalk.bold('card_grants:write')} scope.\n`);

  let token = '';
  let user;
  while (true) {
    token = await promptRequired('HCB token (hcb_...): ', true);

    if (!token.startsWith('hcb_')) {
      console.log(chalk.yellow('Token should start with hcb_ — try again.'));
      continue;
    }

    process.stdout.write(chalk.dim('Verifying token...'));
    try {
      user = await getCurrentUser(token);
      process.stdout.write(chalk.dim(' done.\n'));
      break;
    } catch (err) {
      process.stdout.write('\n');
      console.log(chalk.red(`Invalid token: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  console.log(chalk.green(`\nAuthenticated as ${chalk.bold(user.name)} (${user.email})`));

  // Org selection
  let orgId = typeof raw.hcbOrganizationId === 'string' ? raw.hcbOrganizationId : '';
  const keepOrg = orgId
    ? await prompt(`Keep existing organization "${orgId}"? (Y/n) `)
    : '';

  if (!orgId || keepOrg.toLowerCase() === 'n') {
    while (true) {
      orgId = await promptRequired('\nHCB organization ID or slug: ');
      process.stdout.write(chalk.dim('Fetching organization...'));
      try {
        const org = await getOrganization(token, orgId);
        process.stdout.write(chalk.dim(' done.\n'));
        console.log(chalk.green(`Organization: ${chalk.bold(org.name)} (${chalk.blue(`${HCB_WEB}/${org.slug}`)})`));
        orgId = org.id;
        break;
      } catch {
        process.stdout.write('\n');
        console.log(chalk.yellow(`Could not find organization "${orgId}" — try again.`));
      }
    }
  }

  saveConfig({ hcbToken: token, hcbOrganizationId: orgId });
  console.log(chalk.green(`\nSaved to ${CONFIG_PATH}`));
}
