#!/usr/bin/env node
import { program } from 'commander';
import { existsCommand } from './commands/exists.js';
import { slackCommand } from './commands/slack.js';
import { grantTemplateCommand } from './commands/grant/template.js';
import { grantNewCommand } from './commands/grant/new.js';
import { hcbStatusCommand } from './commands/hcb/status.js';
import { hcbLoginCommand } from './commands/hcb/login.js';
import { hcbLogoutCommand } from './commands/hcb/logout.js';

program
  .name('youswish')
  .description('CLI utilities for Hack Club YSWS grant programs')
  .version('0.1.0');

program
  .command('exists <urls...>')
  .alias('e')
  .description('Check if one or more project URLs exist in the YSWS Projects DB (separate multiple URLs with spaces, commas, semicolons, or tabs)')
  .action((urls: string[]) => existsCommand(urls));

program
  .command('slack <emails...>')
  .alias('s')
  .description('Look up a Slack user by email address')
  .action((emails: string[]) => slackCommand(emails));

const grant = program
  .command('grant')
  .alias('g')
  .description('Manage HCB card grants');

grant
  .command('template')
  .alias('t')
  .description('Create a new grant template')
  .action(() => grantTemplateCommand());

grant
  .command('new <target>')
  .alias('n')
  .description('Send a grant to an email address or Airtable record ID')
  .option('-a, --amount <dollars>', 'Dollar amount (required when target is an email)')
  .option('-t, --template <name>', 'Grant template to use')
  .action((target: string, opts: { amount?: string; template?: string }) =>
    grantNewCommand(target, opts)
  );

const hcb = program
  .command('hcb')
  .alias('h')
  .description('Manage HCB authentication and configuration');

hcb
  .command('status')
  .description('Show current HCB authentication status and configured organization')
  .action(() => hcbStatusCommand());

hcb
  .command('login')
  .description('Authenticate with HCB and configure an organization')
  .action(() => hcbLoginCommand());

hcb
  .command('logout')
  .description('Remove HCB credentials from config')
  .action(() => hcbLogoutCommand());

program.parse();
