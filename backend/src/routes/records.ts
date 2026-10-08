import { Router, Response } from 'express';
import { query } from '../db/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { extractJiraKeysFromPR, detectJiraKeys } from '../services/github';

const router = Router();

const IS_CONFIRMED = `(c.id IS NOT NULL AND (pr.reverted_at IS NULL OR c.confirmed_at > pr.reverted_at))`;

// Get all records with filters
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { search, status, date_from, date_to, limit = 20, offset = 0 } = req.query;

    let sqlQuery = `
      SELECT
        r.*,
        u.email as created_by_email,
        CASE WHEN ${IS_CONFIRMED} THEN c.id END as latest_confirmation_id,
        c.confirmed_at as latest_confirmed_at,
        c.notes as latest_confirmation_notes,
        cu.email as latest_confirmed_by_email
      FROM implementation_records r
      LEFT JOIN users u ON r.created_by_user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM confirmations
        WHERE implementation_record_id = r.id
        ORDER BY confirmed_at DESC
        LIMIT 1
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT reverted_at FROM status_reverts
        WHERE implementation_record_id = r.id
        ORDER BY reverted_at DESC
        LIMIT 1
      ) pr ON true
      LEFT JOIN users cu ON c.confirmed_by_user_id = cu.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sqlQuery += ` AND (r.pr_url ILIKE $${paramIndex} OR r.jira_keys ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'confirmed') {
      sqlQuery += ` AND ${IS_CONFIRMED}`;
    } else if (status === 'pending') {
      sqlQuery += ` AND NOT ${IS_CONFIRMED}`;
    }

    if (date_from) {
      sqlQuery += ` AND r.created_at >= $${paramIndex}::timestamp`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      sqlQuery += ` AND r.created_at < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(date_to);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sqlQuery, params);

    res.json({
      records: result.rows,
      count: result.rows.length,
    });
  })
);

// Get single record with all confirmations
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, u.email as created_by_email
       FROM implementation_records r
       LEFT JOIN users u ON r.created_by_user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Record not found');
    }

    const record = result.rows[0];

    // Get all confirmations
    const confirmationsResult = await query(
      `SELECT c.*, u.email as confirmed_by_email
       FROM confirmations c
       LEFT JOIN users u ON c.confirmed_by_user_id = u.id
       WHERE c.implementation_record_id = $1
       ORDER BY c.confirmed_at DESC`,
      [id]
    );

    const revertsResult = await query(
      `SELECT sr.*, u.email as reverted_by_email
       FROM status_reverts sr
       LEFT JOIN users u ON sr.reverted_by_user_id = u.id
       WHERE sr.implementation_record_id = $1
       ORDER BY sr.reverted_at DESC`,
      [id]
    );

    const latestConfirmation = confirmationsResult.rows[0];
    const latestRevert = revertsResult.rows[0];
    const isConfirmed = !!latestConfirmation &&
      (!latestRevert || latestConfirmation.confirmed_at > latestRevert.reverted_at);

    res.json({
      record,
      confirmations: confirmationsResult.rows,
      reverts: revertsResult.rows,
      is_confirmed: isConfirmed,
    });
  })
);

// Create new record
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { pr_url, jira_keys, description } = req.body;
    const userId = req.userId;

    if (!pr_url) {
      throw new AppError(400, 'PR URL is required');
    }

    // Validate PR URL format
    if (!pr_url.includes('github.com') || !pr_url.includes('/pull/')) {
      throw new AppError(400, 'Invalid GitHub PR URL');
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
    } else {
      // Validate provided JIRA keys
      const entries = jira_keys.split(',').map((k: string) => k.trim()).filter((k: string) => k);
      const invalidKeys = entries.filter((k: string) => detectJiraKeys(k).length === 0);

      if (invalidKeys.length > 0) {
        throw new AppError(400, `Invalid JIRA key format: ${invalidKeys.join(', ')}`);
      }

      finalJiraKeys = [...new Set(entries.flatMap((k: string) => detectJiraKeys(k)))].join(',');
    }

    const existingPr = await query(
      'SELECT id FROM implementation_records WHERE LOWER(RTRIM(pr_url, \'/\')) = LOWER(RTRIM($1, \'/\'))',
      [pr_url]
    );
    if (existingPr.rows.length > 0) {
      throw new AppError(409, `This PR has already been added (record #${existingPr.rows[0].id})`);
    }

    const jiraList = finalJiraKeys ? finalJiraKeys.split(',') : [];
    if (jiraList.length > 0) {
      const existingJira = await query(
        'SELECT id, string_to_array(jira_keys, \',\') AS keys FROM implementation_records WHERE string_to_array(jira_keys, \',\') && $1::text[] LIMIT 1',
        [jiraList]
      );
      if (existingJira.rows.length > 0) {
        const taken = existingJira.rows[0].keys.filter((k: string) => jiraList.includes(k));
        throw new AppError(409, `JIRA ticket(s) already added: ${taken.join(', ')} (record #${existingJira.rows[0].id})`);
      }
    }

    const result = await query(
      `INSERT INTO implementation_records (pr_url, jira_keys, description, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pr_url, finalJiraKeys, description || null, userId]
    );

    res.status(201).json(result.rows[0]);
  })
);

// Confirm record on production
router.post(
  '/:id/confirm',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { notes, environment = 'production' } = req.body;
    const userId = req.userId;

    if (!notes || !String(notes).trim()) {
      throw new AppError(400, 'Post implementation comment is required');
    }

    // Verify record exists
    const recordResult = await query(
      'SELECT * FROM implementation_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      throw new AppError(404, 'Record not found');
    }

    // Create confirmation
    console.log('Creating confirmation for record:', id, 'by user:', userId);

    try {
      const idResult = await query(
        `INSERT INTO confirmations (implementation_record_id, confirmed_by_user_id, notes, environment)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [id, userId, notes || null, environment]
      );

      const confirmationId = idResult.rows[0].id;
      console.log('Confirmation created with ID:', confirmationId);

      const fullConfirmation = await query(
        `SELECT c.*, u.email as confirmed_by_email
         FROM confirmations c
         LEFT JOIN users u ON c.confirmed_by_user_id = u.id
         WHERE c.id = $1`,
        [confirmationId]
      );

      res.status(201).json(fullConfirmation.rows[0]);
    } catch (err) {
      console.error('Error in confirm route:', err);
      throw err;
    }
  })
);

// Set a confirmed record back to pending (history is kept)
router.post(
  '/:id/revert',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.userId;

    if (!comment || !String(comment).trim()) {
      throw new AppError(400, 'Comment is required to set a record to pending');
    }

    const recordResult = await query('SELECT id FROM implementation_records WHERE id = $1', [id]);
    if (recordResult.rows.length === 0) {
      throw new AppError(404, 'Record not found');
    }

    const latestConfirmation = await query(
      'SELECT confirmed_at FROM confirmations WHERE implementation_record_id = $1 ORDER BY confirmed_at DESC LIMIT 1',
      [id]
    );
    const latestRevert = await query(
      'SELECT reverted_at FROM status_reverts WHERE implementation_record_id = $1 ORDER BY reverted_at DESC LIMIT 1',
      [id]
    );

    const confirmedAt = latestConfirmation.rows[0]?.confirmed_at;
    const revertedAt = latestRevert.rows[0]?.reverted_at;
    if (!confirmedAt || (revertedAt && revertedAt >= confirmedAt)) {
      throw new AppError(400, 'Record is not confirmed');
    }

    const result = await query(
      `INSERT INTO status_reverts (implementation_record_id, comment, reverted_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id, implementation_record_id, comment, reverted_by_user_id, reverted_at`,
      [id, String(comment).trim(), userId]
    );

    res.status(201).json(result.rows[0]);
  })
);

// Get confirmations for a record
router.get(
  '/:id/confirmations',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.email as confirmed_by_email
       FROM confirmations c
       LEFT JOIN users u ON c.confirmed_by_user_id = u.id
       WHERE c.implementation_record_id = $1
       ORDER BY c.confirmed_at DESC`,
      [id]
    );

    res.json(result.rows);
  })
);

// Delete record (only if not confirmed)
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId;

    const recordResult = await query(
      'SELECT * FROM implementation_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      throw new AppError(404, 'Record not found');
    }

    const record = recordResult.rows[0];

    // Only creator can delete
    if (record.created_by_user_id !== userId) {
      throw new AppError(403, 'You can only delete your own records');
    }

    // Check if record has confirmations
    const confirmationsResult = await query(
      'SELECT * FROM confirmations WHERE implementation_record_id = $1',
      [id]
    );

    if (confirmationsResult.rows.length > 0) {
      throw new AppError(400, 'Cannot delete record that has been confirmed');
    }

    await query('DELETE FROM implementation_records WHERE id = $1', [id]);

    res.json({ message: 'Record deleted successfully' });
  })
);

export default router;
