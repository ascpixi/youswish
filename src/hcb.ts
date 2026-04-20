export const HCB_BASE = 'https://hcb.hackclub.com/api/v4';
export const HCB_WEB = 'https://hcb.hackclub.com';

export interface HcbUser {
  id: string;
  name: string;
  email: string;
  admin: boolean;
}

export interface HcbOrganization {
  id: string;
  name: string;
  slug: string;
  balances?: { balance_cents: number };
}

export async function getCurrentUser(token: string): Promise<HcbUser> {
  const res = await fetch(`${HCB_BASE}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('Invalid or expired token.');
  if (!res.ok) throw new Error(`HCB API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HcbUser>;
}

export async function getOrganization(token: string, orgId: string): Promise<HcbOrganization> {
  const res = await fetch(`${HCB_BASE}/organizations/${encodeURIComponent(orgId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HCB API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HcbOrganization>;
}

export interface CardGrantOptions {
  amountCents: number;
  email: string;
  purpose?: string;
  inviteMessage?: string;
  instructions?: string;
  expirationAt?: string;
}

export interface CardGrant {
  id: string;
  amount_cents: number;
  email: string;
  purpose: string;
  status: string;
  expires_on: string;
}

export async function createCardGrant(
  token: string,
  organizationId: string,
  opts: CardGrantOptions
): Promise<CardGrant> {
  const body: Record<string, unknown> = { amount_cents: opts.amountCents, email: opts.email };
  if (opts.purpose) body.purpose = opts.purpose;
  if (opts.inviteMessage) body.invite_message = opts.inviteMessage;
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.expirationAt) body.expiration_at = opts.expirationAt;

  const res = await fetch(
    `${HCB_BASE}/organizations/${encodeURIComponent(organizationId)}/card_grants`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: string; messages?: string[] } | null;
    const detail = data?.messages?.join(', ') ?? data?.error ?? `HTTP ${res.status}`;
    throw new Error(`HCB API error: ${detail}`);
  }

  return res.json() as Promise<CardGrant>;
}

export function expirationDate(lifetimeDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + lifetimeDays);
  return d.toISOString().split('T')[0];
}
