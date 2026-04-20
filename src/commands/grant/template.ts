import chalk from 'chalk';
import { loadGrantTemplates, saveConfig, type GrantTemplate } from '../../config.js';
import { prompt, promptRequired } from '../../prompt.js';

export async function grantTemplateCommand(): Promise<void> {
  console.log(chalk.bold('Create a new grant template\n'));

  const name = await promptRequired('Template name: ');

  if (loadGrantTemplates()[name]) {
    const overwrite = await prompt(chalk.yellow(`Template "${name}" already exists. Overwrite? (y/N) `));
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const inviteMessage = await promptRequired('Invitation message: ');

  let purpose = '';
  while (true) {
    purpose = await promptRequired('Purpose (max 30 chars): ');
    if (purpose.length <= 30) break;
    console.log(chalk.yellow(`Purpose must be 30 characters or fewer (got ${purpose.length}).`));
  }

  const instructions = await promptRequired('Instructions: ');

  let lifetimeDays = 0;
  while (true) {
    const raw = await promptRequired('Grant lifetime (days): ');
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0) { lifetimeDays = n; break; }
    console.log(chalk.yellow('Please enter a positive integer.'));
  }

  let dollarsPerHour = 0;
  while (true) {
    const raw = await promptRequired('$ per hour: ');
    const n = parseFloat(raw.replace(/^\$/, ''));
    if (!isNaN(n) && n > 0) { dollarsPerHour = n; break; }
    console.log(chalk.yellow('Please enter a positive number.'));
  }

  const template: GrantTemplate = { inviteMessage, purpose, instructions, lifetimeDays, dollarsPerHour };
  const templates = loadGrantTemplates();
  templates[name] = template;
  saveConfig({ grantTemplates: templates });

  console.log(chalk.green(`\nTemplate "${name}" saved.`));
  console.log(`  ${chalk.bold('Purpose:')}       ${purpose}`);
  console.log(`  ${chalk.bold('Lifetime:')}      ${lifetimeDays} days`);
  console.log(`  ${chalk.bold('$/hour:')}        $${dollarsPerHour}`);
}
