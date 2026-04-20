const BASE_ID = 'app3A5kJwYqxMLOgh';
const TABLE_ID = 'tblzWWGUYHVH7Zyqf';
const VIEW_ID = 'viwR1DSTglVPWzYRS';

export const AIRTABLE_RECORD_URL = (recordId: string) =>
  `https://airtable.com/${BASE_ID}/${TABLE_ID}/${VIEW_ID}/${recordId}`;

export interface ProjectRecord {
  recordId: string;
  id: string;
  codeUrl: string;
  playableUrl: string;
  overrideHoursSpent: number | null;
}

interface RawRecord {
  id: string;
  fields: {
    ID?: string;
    'Code URL'?: string;
    'Playable URL'?: string;
    'Override Hours Spent'?: number;
  };
}

// Builds an Airtable filterByFormula that returns records where Code URL or
// Playable URL contains any of the given path variants at a path boundary.
// Each variant v matches stored URLs that are either:
//   - an exact suffix match (the stored URL ends with v, covering protocol variations)
//   - a child path (stored URL contains v followed by /)
function buildFilterFormula(variants: string[]): string {
  const conditions: string[] = [];
  for (const v of variants) {
    const escaped = v.replace(/"/g, '\\"');
    for (const field of ['Code URL', 'Playable URL']) {
      // child path: stored URL has variant as a path prefix (e.g. domain/user/repo/releases)
      conditions.push(`FIND("${escaped}/", LOWER({${field}}))`);
      // exact/terminal match: stored URL ends with the variant
      conditions.push(`RIGHT(LOWER({${field}}), ${v.length}) = "${escaped}"`);
    }
  }
  return `OR(${conditions.join(',')})`;
}

// Fetches a single project by Airtable record ID (rec...) or YSWS internal ID.
export async function fetchProjectById(token: string, identifier: string): Promise<ProjectRecord | null> {
  const isRecordId = identifier.startsWith('rec');

  if (isRecordId) {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${encodeURIComponent(identifier)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Airtable API error ${res.status}: ${await res.text()}`);
    const r = (await res.json()) as RawRecord;
    return {
      recordId: r.id,
      id: r.fields['ID'] ?? '',
      codeUrl: r.fields['Code URL'] ?? '',
      playableUrl: r.fields['Playable URL'] ?? '',
      overrideHoursSpent: r.fields['Override Hours Spent'] ?? null,
    };
  }

  // Look up by YSWS internal ID field
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
  for (const field of ['ID', 'Code URL', 'Playable URL', 'Override Hours Spent']) {
    url.searchParams.append('fields[]', field);
  }
  url.searchParams.set('filterByFormula', `{ID} = "${identifier.replace(/"/g, '\\"')}"`);
  url.searchParams.set('maxRecords', '1');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Airtable API error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { records: RawRecord[] };
  if (data.records.length === 0) return null;
  const r = data.records[0];
  return {
    recordId: r.id,
    id: r.fields['ID'] ?? '',
    codeUrl: r.fields['Code URL'] ?? '',
    playableUrl: r.fields['Playable URL'] ?? '',
    overrideHoursSpent: r.fields['Override Hours Spent'] ?? null,
  };
}

export async function searchProjects(token: string, variants: string[]): Promise<ProjectRecord[]> {
  const records: ProjectRecord[] = [];
  let offset: string | undefined;
  const formula = buildFilterFormula(variants);

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
    for (const field of ['ID', 'Code URL', 'Playable URL', 'Override Hours Spent']) {
      url.searchParams.append('fields[]', field);
    }
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { records: RawRecord[]; offset?: string };
    for (const r of data.records) {
      records.push({
        recordId: r.id,
        id: r.fields['ID'] ?? '',
        codeUrl: r.fields['Code URL'] ?? '',
        playableUrl: r.fields['Playable URL'] ?? '',
        overrideHoursSpent: r.fields['Override Hours Spent'] ?? null,
      });
    }
    offset = data.offset;
  } while (offset);

  return records;
}
