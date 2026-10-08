import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

function getUserId(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.userId || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recordId = params.id;
    const { notes, environment = 'production' } = await req.json();

    // Verify record exists
    const recordResult = await query(
      'SELECT * FROM implementation_records WHERE id = $1',
      [recordId]
    );

    if (recordResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Create confirmation
    const result = await query(
      `INSERT INTO confirmations (implementation_record_id, confirmed_by_user_id, notes, environment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, implementation_record_id, confirmed_by_user_id, confirmed_at, notes, environment, created_at`,
      [recordId, userId, notes || null, environment]
    );

    // Get user email for response
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const confirmation = result.rows[0];

    return NextResponse.json({
      ...confirmation,
      confirmed_by_email: userResult.rows[0]?.email,
    }, { status: 201 });
  } catch (error) {
    console.error('Confirm record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
