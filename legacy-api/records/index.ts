import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { extractJiraKeysFromPR, detectJiraKeys } from '@/lib/github';

function getUserId(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.userId || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    let sql = `
      SELECT
        r.*,
        u.email as created_by_email,
        c.id as latest_confirmation_id,
        c.confirmed_at as latest_confirmed_at,
        cu.email as latest_confirmed_by_email
      FROM implementation_records r
      LEFT JOIN users u ON r.created_by_user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM confirmations
        WHERE implementation_record_id = r.id
        ORDER BY confirmed_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN users cu ON c.confirmed_by_user_id = cu.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (r.pr_url ILIKE $${paramIndex} OR r.jira_keys ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'confirmed') {
      sql += ` AND c.id IS NOT NULL`;
    } else if (status === 'pending') {
      sql += ` AND c.id IS NULL`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    return NextResponse.json({
      records: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pr_url, jira_keys, description } = await req.json();

    if (!pr_url) {
      return NextResponse.json(
        { error: 'PR URL is required' },
        { status: 400 }
      );
    }

    if (!pr_url.includes('github.com') || !pr_url.includes('/pull/')) {
      return NextResponse.json(
        { error: 'Invalid GitHub PR URL' },
        { status: 400 }
      );
    }

    let finalJiraKeys = jira_keys || '';

    // If jira_keys not provided, try to auto-detect from PR
    if (!jira_keys) {
      try {
        const detectedKeys = await extractJiraKeysFromPR(pr_url);
        finalJiraKeys = detectedKeys.join(',');
      } catch (err) {
        console.error('Error auto-detecting JIRA keys:', err);
        // Continue without auto-detection
      }
    }

    const result = await query(
      `INSERT INTO implementation_records (pr_url, jira_keys, description, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pr_url, finalJiraKeys || null, description || null, userId]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
