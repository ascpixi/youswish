import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { fetchAllProjects, AIRTABLE_RECORD_URL, type ProjectRecord } from '../airtable.js';
import { urlSimilarity } from '../url.js';

const EXACT_THRESHOLD = 0.95;
const FUZZY_THRESHOLD = 0.70;

interface Match {
  record: ProjectRecord;
  score: number;
  matchedField: 'code' | 'playable' | 'both';
}

function findMatches(query: string, records: ProjectRecord[]): Match[] {
  const results: Match[] = [];

  for (const record of records) {
    const codeScore = urlSimilarity(query, record.codeUrl);
    const playableScore = urlSimilarity(query, record.playableUrl);
    const score = Math.max(codeScore, playableScore);

    if (score < FUZZY_THRESHOLD) continue;

    const matchedField =
      codeScore >= FUZZY_THRESHOLD && playableScore >= FUZZY_THRESHOLD
        ? 'both'
        : codeScore >= playableScore
        ? 'code'
        : 'playable';

    results.push({ record, score, matchedField });
  }

  return results.sort((a, b) => b.score - a.score);
}

function printRecord(match: Match): void {
  const { record, score, matchedField } = match;
  const isExact = score >= EXACT_THRESHOLD;
  const label = isExact ? chalk.red.bold('EXACT MATCH') : chalk.yellow.bold('FUZZY MATCH');
  const pct = chalk.dim(`(${(score * 100).toFixed(0)}% similarity)`);
  const fieldLabel = matchedField === 'both'
    ? chalk.cyan('Code URL & Playable URL')
    : matchedField === 'code'
    ? chalk.cyan('Code URL')
    : chalk.cyan('Playable URL');

  console.log(`\n${label} ${pct} — matched on ${fieldLabel}`);
  console.log(`  ${chalk.bold('ID:')}              ${record.id || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Airtable:')}        ${chalk.blue(AIRTABLE_RECORD_URL(record.recordId))}`);
  console.log(`  ${chalk.bold('Code URL:')}        ${record.codeUrl || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Playable URL:')}    ${record.playableUrl || chalk.dim('(none)')}`);
  console.log(`  ${chalk.bold('Override Hours:')}  ${record.overrideHoursSpent ?? chalk.dim('(none)')}`);
}

export async function existsCommand(queryUrl: string): Promise<void> {
  const config = loadConfig();

  process.stdout.write(chalk.dim(`Fetching projects from Airtable...`));
  let records: ProjectRecord[];
  try {
    records = await fetchAllProjects(config.airtableToken);
  } catch (err) {
    process.stdout.write('\n');
    console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
  process.stdout.write(chalk.dim(` ${records.length} records loaded.\n`));

  const matches = findMatches(queryUrl, records);

  if (matches.length === 0) {
    console.log(chalk.green(`\nNo matches found for: ${queryUrl}`));
    console.log(chalk.dim('This project does not appear to exist in the YSWS database.'));
    return;
  }

  const exactCount = matches.filter(m => m.score >= EXACT_THRESHOLD).length;
  const fuzzyCount = matches.length - exactCount;

  console.log(
    `\nFound ${chalk.bold(String(matches.length))} match${matches.length !== 1 ? 'es' : ''} for: ${chalk.bold(queryUrl)}` +
    (exactCount > 0 ? chalk.red(` (${exactCount} exact)`) : '') +
    (fuzzyCount > 0 ? chalk.yellow(` (${fuzzyCount} fuzzy)`) : '')
  );

  for (const match of matches) {
    printRecord(match);
  }

  console.log('');
}
