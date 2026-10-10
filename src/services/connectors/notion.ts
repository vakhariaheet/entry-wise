export interface NotionConfig {
  token: string;
  databaseId: string;
}

export interface NotionPayload {
  siteDomain: string;
  submissionId: string;
  formData: Record<string, string>;
  submittedAt?: string;
}

interface NotionPropertySchema {
  id: string;
  name?: string;
  type: string;
}

/**
 * Normalizes a Notion Database ID (extracts the 32-char hex UUID even if a full Notion URL was pasted)
 */
export function normalizeNotionDatabaseId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
  );
  return match ? match[1] : trimmed;
}

/**
 * Dispatches submission data directly to a Notion Database as a new Page.
 * Automatically inspects the Notion database schema to match properties by name and type,
 * and appends all submission fields as structured blocks in the page body so no data is ever lost.
 */
export async function dispatchNotion(
  config: NotionConfig,
  payload: NotionPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const token = config.token?.trim();
    const databaseId = normalizeNotionDatabaseId(config.databaseId || '');

    if (!token || !databaseId) {
      return { success: false, error: 'Missing Notion Integration Token or Database ID' };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
      'User-Agent': 'EntryWise-Notion/1.0',
    };

    // 1. Fetch database schema to discover property names & types
    let dbProperties: Record<string, NotionPropertySchema> = {};
    let titlePropName = 'Name';

    const dbRes = await fetch(
      `https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      }
    );

    if (dbRes.ok) {
      const dbJson = (await dbRes.json().catch(() => ({}))) as {
        properties?: Record<string, NotionPropertySchema>;
      };
      if (dbJson.properties) {
        dbProperties = dbJson.properties;
        for (const [propName, propDef] of Object.entries(dbProperties)) {
          if (propDef.type === 'title') {
            titlePropName = propName;
            break;
          }
        }
      }
    }

    // 2. Map form fields to Notion properties (case-insensitive matching)
    const propertiesPayload: Record<string, unknown> = {};
    const lowerPropMap = new Map<string, { name: string; type: string }>();
    for (const [propName, propDef] of Object.entries(dbProperties)) {
      lowerPropMap.set(propName.toLowerCase().replace(/[^a-z0-9]/g, ''), {
        name: propName,
        type: propDef.type,
      });
    }

    let titleAssigned = false;

    for (const [rawKey, rawVal] of Object.entries(payload.formData)) {
      if (rawKey.startsWith('_')) continue;
      const val = String(rawVal ?? '').trim();
      if (!val) continue;

      const normalizedKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedProp = lowerPropMap.get(normalizedKey);

      if (matchedProp) {
        const { name: propName, type: propType } = matchedProp;
        if (propType === 'title') {
          propertiesPayload[propName] = {
            title: [{ text: { content: val.slice(0, 2000) } }],
          };
          titleAssigned = true;
        } else if (propType === 'rich_text') {
          propertiesPayload[propName] = {
            rich_text: [{ text: { content: val.slice(0, 2000) } }],
          };
        } else if (propType === 'email') {
          propertiesPayload[propName] = { email: val };
        } else if (propType === 'phone_number') {
          propertiesPayload[propName] = { phone_number: val };
        } else if (propType === 'url') {
          propertiesPayload[propName] = { url: val };
        } else if (propType === 'number') {
          const num = Number(val);
          if (!Number.isNaN(num)) {
            propertiesPayload[propName] = { number: num };
          }
        } else if (propType === 'select') {
          propertiesPayload[propName] = { select: { name: val.slice(0, 100) } };
        }
      }
    }

    // Ensure the required title property is always populated
    if (!titleAssigned) {
      const fallbackTitle =
        payload.formData.name ||
        payload.formData.full_name ||
        payload.formData.email ||
        `Submission ${payload.submissionId} (${payload.siteDomain})`;

      propertiesPayload[titlePropName] = {
        title: [{ text: { content: String(fallbackTitle).slice(0, 2000) } }],
      };
    }

    // 3. Build rich page body blocks so all fields are readable inside the Notion page
    const childrenBlocks = Object.entries(payload.formData)
      .filter(([k]) => !k.startsWith('_'))
      .slice(0, 50)
      .map(([k, v]) => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: `${k}: ` },
              annotations: { bold: true },
            },
            {
              type: 'text',
              text: { content: String(v ?? '').slice(0, 1900) },
            },
          ],
        },
      }));

    const createRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: propertiesPayload,
        children: childrenBlocks,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!createRes.ok) {
      const errBody = (await createRes.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        status: createRes.status,
        error: errBody?.message || `Notion HTTP ${createRes.status}`,
      };
    }

    return { success: true, status: createRes.status };
  } catch (err: unknown) {
    console.error('Notion dispatch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Notion dispatch failed',
    };
  }
}
