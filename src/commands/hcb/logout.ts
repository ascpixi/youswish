import chalk from 'chalk';
import { readRawConfig, deleteConfigKeys, CONFIG_PATH } from '../../config.js';
import { prompt } from '../../prompt.js';

export async function hcbLogoutCommand(): Promise<void> {
  const raw = readRawConfig();

  if (!raw.hcbToken) {
    console.log(chalk.yellow('Not logged in to HCB.'));
    return;
  }

  const confirm = await prompt(chalk.bold('Remove HCB credentials from config? (y/N) '));
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  deleteConfigKeys('hcbToken', 'hcbOrganizationId');
  console.log(chalk.green(`HCB credentials removed from ${CONFIG_PATH}.`));
}
