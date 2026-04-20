#!/usr/bin/env node
import { program } from 'commander';
import { existsCommand } from './commands/exists.js';

program
  .name('youswish')
  .description('CLI utilities for Hack Club YSWS grant programs')
  .version('0.1.0');

program
  .command('exists <urls...>')
  .alias('e')
  .description('Check if one or more project URLs exist in the YSWS Projects DB (separate multiple URLs with spaces, commas, or semicolons)')
  .action((urls: string[]) => existsCommand(urls));

program.parse();
