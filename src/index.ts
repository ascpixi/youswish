#!/usr/bin/env node
import { program } from 'commander';
import { existsCommand } from './commands/exists.js';

program
  .name('youswish')
  .description('CLI utilities for Hack Club YSWS grant programs')
  .version('0.1.0');

program
  .command('exists <url>')
  .description('Check if a project URL already exists in the YSWS Projects DB')
  .action((url: string) => existsCommand(url));

program.parse();
