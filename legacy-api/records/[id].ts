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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recordId = params.id;

    // Get record
    const recordResult = await query(
      `SELECT r.*, u.email as created_by_email
       FROM implementation_records r
       LEFT JOIN users u ON r.created_by_user_id = u.id
       WHERE r.id = $1`,
      [recordId]
    );

    if (recordResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Get confirmations
    const confirmationsResult = await query(
      `SELECT c.*, u.email as confirmed_by_email
       FROM confirmations c
       LEFT JOIN users u ON c.confirmed_by_user_id = u.id
       WHERE c.implementation_record_id = $1
       ORDER BY c.confirmed_at DESC`,
      [recordId]
    );

    return NextResponse.json({
      record: recordResult.rows[0],
      confirmations: confirmationsResult.rows,
    });
  } catch (error) {
    console.error('Get record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recordId = params.id;

    // Get record
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

    const record = recordResult.rows[0];

    // Only creator can delete
    if (record.created_by_user_id !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own records' },
        { status: 403 }
      );
    }

    // Check if record has confirmations
    const confirmationsResult = await query(
      'SELECT * FROM confirmations WHERE implementation_record_id = $1',
      [recordId]
    );

    if (confirmationsResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete record that has been confirmed' },
        { status: 400 }
      );
    }

    await query('DELETE FROM implementation_records WHERE id = $1', [recordId]);

    return NextResponse.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
