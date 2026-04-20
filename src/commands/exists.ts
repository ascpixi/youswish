import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { searchProjects, AIRTABLE_RECORD_URL, type ProjectRecord } from '../airtable.js';
import { getSearchVariants, pathMatchKind, type MatchKind } from '../url.js';

interface Match {
  record: ProjectRecord;
  kind: MatchKind;
  matchedField: 'code' | 'playable' | 'both';
}

function findMatches(queryUrl: string, records: ProjectRecord[]): Match[] {
  const results: Match[] = [];

  for (const record of records) {
    const codeKind = pathMatchKind(queryUrl, record.codeUrl);
    const playableKind = pathMatchKind(queryUrl, record.playableUrl);

    if (!codeKind && !playableKind) continue;

    // Pick the best kind: exact > ancestor > descendant
    const kindPriority: MatchKind[] = ['exact', 'ancestor', 'descendant'];
    const kinds = [codeKind, playableKind].filter(Boolean) as MatchKind[];
    const kind = kindPriority.find(k => kinds.includes(k)) ?? kinds[0];

    const matchedField =
      codeKind && playableKind ? 'both' : codeKind ? 'code' : 'playable';

    results.push({ record, kind, matchedField });
  }

  const priority: Record<MatchKind, number> = { exact: 0, ancestor: 1, descendant: 2 };
  return results.sort((a, b) => priority[a.kind] - priority[b.kind]);
}

function printRecord(match: Match): void {
  const { record, kind, matchedField } = match;

  const label =
    kind === 'exact' ? chalk.red.bold('EXACT MATCH') :
    kind === 'ancestor' ? chalk.yellow.bold('CHILD PATH MATCH') :
    chalk.yellow.bold('PARENT PATH MATCH');

  const kindNote =
    kind === 'ancestor' ? chalk.dim('(stored URL is a sub-path of your query)') :
    kind === 'descendant' ? chalk.dim('(stored URL is a parent path of your query)') :
    '';

  const fieldLabel =
    matchedField === 'both' ? chalk.cyan('Code URL & Playable URL') :
    matchedField === 'code' ? chalk.cyan('Code URL') :
    chalk.cyan('Playable URL');

  console.log(`\n${label} ${kindNote} — matched on ${fieldLabel}`);
  console.log(`  ${chalk.bold('ID:')}              ${record.id || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Airtable:')}        ${chalk.blue(AIRTABLE_RECORD_URL(record.recordId))}`);
  console.log(`  ${chalk.bold('Code URL:')}        ${record.codeUrl || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Playable URL:')}    ${record.playableUrl || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Override Hours:')}  ${record.overrideHoursSpent ?? chalk.dim('(none)')}`);
}

export async function existsCommand(queryUrl: string): Promise<void> {
  const config = await loadConfig();

  const variants = getSearchVariants(queryUrl);
  if (variants.length === 0) {
    console.error(chalk.red('Could not parse a searchable URL from the input.'));
    process.exit(1);
  }

  process.stdout.write(chalk.dim('Searching Airtable...'));
  let records: ProjectRecord[];
  try {
    records = await searchProjects(config.airtableToken, variants);
  } catch (err) {
    process.stdout.write('\n');
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
  process.stdout.write(chalk.dim(` done.\n`));

  const matches = findMatches(queryUrl, records);

  if (matches.length === 0) {
    console.log(chalk.green(`\nNo matches found for: ${queryUrl}`));
    console.log(chalk.dim('This project does not appear to exist in the YSWS database.'));
    return;
  }

  const exactCount = matches.filter(m => m.kind === 'exact').length;
  const pathCount = matches.length - exactCount;

  console.log(
    `\nFound ${chalk.bold(String(matches.length))} match${matches.length !== 1 ? 'es' : ''} for: ${chalk.bold(queryUrl)}` +
    (exactCount > 0 ? chalk.red(` (${exactCount} exact)`) : '') +
    (pathCount > 0 ? chalk.yellow(` (${pathCount} path)`) : '')
  );

  for (const match of matches) {
    printRecord(match);
  }

  console.log('');
}
