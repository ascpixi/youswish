import chalk from 'chalk';
import { loadConfig, loadHcbConfig, loadGrantTemplates, type GrantTemplate } from '../../config.js';
import { fetchProjectById } from '../../airtable.js';
import { createCardGrant, expirationDate } from '../../hcb.js';
import { prompt } from '../../prompt.js';

async function selectTemplate(templateName?: string): Promise<[string, GrantTemplate]> {
  const templates = loadGrantTemplates();
  const entries = Object.entries(templates);

  if (entries.length === 0) {
    console.error(chalk.red('No grant templates configured. Run `youswish grant template` first.'));
    process.exit(1);
  }

  if (templateName) {
    const t = templates[templateName];
    if (!t) {
      console.error(chalk.red(`Template "${templateName}" not found. Available: ${entries.map(([k]) => k).join(', ')}`));
      process.exit(1);
    }
    return [templateName, t];
  }

  if (entries.length === 1) return entries[0];

  console.log(chalk.bold('Select a template:'));
  entries.forEach(([name], i) => console.log(`  ${chalk.cyan(String(i + 1))}. ${name}`));

  while (true) {
    const raw = await prompt('Template number: ');
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= entries.length) return entries[n - 1];
    console.log(chalk.yellow(`Enter a number between 1 and ${entries.length}.`));
  }
}

export async function grantNewCommand(
  target: string,
  opts: { amount?: string; template?: string }
): Promise<void> {
  const isEmail = target.includes('@');

  const [templateName, template] = await selectTemplate(opts.template);

  let recipientEmail: string;
  let amountCents: number;
  let contextLabel: string;

  if (isEmail) {
    if (!opts.amount) {
      console.error(chalk.red('--amount is required when specifying an email address.'));
      process.exit(1);
    }
    const dollars = parseFloat(opts.amount.replace(/^\$/, ''));
    if (isNaN(dollars) || dollars <= 0) {
      console.error(chalk.red(`Invalid amount: ${opts.amount}`));
      process.exit(1);
    }
    recipientEmail = target;
    amountCents = Math.round(dollars * 100);
    contextLabel = `$${dollars.toFixed(2)} (manual)`;
  } else {
    // Airtable record lookup
    const { airtableToken } = await loadConfig();
    process.stdout.write(chalk.dim(`Looking up Airtable record "${target}"...`));
    const record = await fetchProjectById(airtableToken, target);
    process.stdout.write(chalk.dim(' done.\n'));

    if (!record) {
      console.error(chalk.red(`No record found for identifier: ${target}`));
      process.exit(1);
    }

    if (record.overrideHoursSpent === null) {
      console.error(chalk.red(`Record ${target} has no "Override Hours Spent" value.`));
      process.exit(1);
    }

    // Fetch the email from the record — need the Email field too
    const { airtableToken: tok } = await loadConfig();
    const fullRecord = await fetchRecordWithEmail(tok, record.recordId);
    if (!fullRecord?.email) {
      console.error(chalk.red(`Record ${target} has no email address.`));
      process.exit(1);
    }

    recipientEmail = fullRecord.email;
    const dollars = record.overrideHoursSpent * template.dollarsPerHour;
    amountCents = Math.round(dollars * 100);
    contextLabel = `$${dollars.toFixed(2)} (${record.overrideHoursSpent}h × $${template.dollarsPerHour}/h)`;
  }

  const { hcbToken, hcbOrganizationId } = await loadHcbConfig();
  const expiration = expirationDate(template.lifetimeDays);

  console.log(`\n${chalk.bold('Grant summary:')}`);
  console.log(`  ${chalk.bold('Recipient:')}   ${recipientEmail}`);
  console.log(`  ${chalk.bold('Amount:')}      ${contextLabel}`);
  console.log(`  ${chalk.bold('Template:')}    ${templateName}`);
  console.log(`  ${chalk.bold('Purpose:')}     ${template.purpose}`);
  console.log(`  ${chalk.bold('Expires:')}     ${expiration}`);

  const confirm = await prompt(chalk.bold('\nSend this grant? (y/N) '));
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  process.stdout.write(chalk.dim('Creating HCB card grant...'));
  let grant;
  try {
    grant = await createCardGrant(hcbToken, hcbOrganizationId, {
      amountCents,
      email: recipientEmail,
      purpose: template.purpose,
      inviteMessage: template.inviteMessage,
      instructions: template.instructions,
      expirationAt: expiration,
    });
  } catch (err) {
    process.stdout.write('\n');
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
  process.stdout.write(chalk.dim(' done.\n'));

  console.log(chalk.green(`\n✓ Grant created: ${grant.id}`));
  console.log(`  ${chalk.bold('Status:')}    ${grant.status}`);
  console.log(`  ${chalk.bold('Expires:')}   ${grant.expires_on}`);
}

// Fetches a record with the Email field included.
async function fetchRecordWithEmail(
  token: string,
  recordId: string
): Promise<{ email: string } | null> {
  const BASE_ID = 'app3A5kJwYqxMLOgh';
  const TABLE_ID = 'tblzWWGUYHVH7Zyqf';

  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${encodeURIComponent(recordId)}`);
  url.searchParams.append('fields[]', 'Email');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Airtable API error ${res.status}: ${await res.text()}`);

  const r = await res.json() as { fields: { Email?: string } };
  return r.fields.Email ? { email: r.fields.Email } : null;
}
