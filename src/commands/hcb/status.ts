import chalk from 'chalk';
import { readRawConfig } from '../../config.js';
import { getCurrentUser, getOrganization, HCB_WEB } from '../../hcb.js';

export async function hcbStatusCommand(): Promise<void> {
  const raw = readRawConfig();
  const token = typeof raw.hcbToken === 'string' ? raw.hcbToken : null;
  const orgId = typeof raw.hcbOrganizationId === 'string' ? raw.hcbOrganizationId : null;

  if (!token) {
    console.log(chalk.yellow('Not logged in to HCB.'));
    console.log(chalk.dim('Run `youswish hcb login` to authenticate.'));
    return;
  }

  process.stdout.write(chalk.dim('Verifying token...'));
  let user;
  try {
    user = await getCurrentUser(token);
    process.stdout.write(chalk.dim(' done.\n\n'));
  } catch (err) {
    process.stdout.write('\n');
    console.log(`${chalk.red('✗')} ${chalk.bold('Token:')} invalid or expired`);
    console.log(chalk.dim(`  ${err instanceof Error ? err.message : String(err)}`));
    console.log(chalk.dim('\nRun `youswish hcb login` to re-authenticate.'));
    return;
  }

  console.log(`${chalk.green('✓')} ${chalk.bold('Logged in to HCB')}`);
  console.log(`  ${chalk.bold('Name:')}    ${user.name}`);
  console.log(`  ${chalk.bold('Email:')}   ${user.email}`);
  console.log(`  ${chalk.bold('Profile:')} ${chalk.blue(`${HCB_WEB}/@${user.id}`)}`);
  if (user.admin) console.log(`  ${chalk.cyan('(HCB admin)')}`);

  console.log('');

  if (!orgId) {
    console.log(chalk.yellow('No organization configured.'));
    console.log(chalk.dim('Run `youswish hcb org` to set one.'));
    return;
  }

  process.stdout.write(chalk.dim(`Fetching organization "${orgId}"...`));
  try {
    const org = await getOrganization(token, orgId);
    process.stdout.write(chalk.dim(' done.\n\n'));
    const balance = org.balances?.balance_cents;
    console.log(`${chalk.bold('Organization:')} ${org.name}`);
    console.log(`  ${chalk.bold('ID:')}       ${org.id}`);
    console.log(`  ${chalk.bold('Slug:')}     ${org.slug}`);
    console.log(`  ${chalk.bold('URL:')}      ${chalk.blue(`${HCB_WEB}/${org.slug}`)}`);
    if (balance !== undefined) {
      const dollars = (balance / 100).toFixed(2);
      console.log(`  ${chalk.bold('Balance:')}  $${dollars}`);
    }
  } catch {
    process.stdout.write('\n');
    console.log(chalk.yellow(`Could not fetch org "${orgId}" — it may not exist or the token lacks access.`));
  }

  console.log('');
}
