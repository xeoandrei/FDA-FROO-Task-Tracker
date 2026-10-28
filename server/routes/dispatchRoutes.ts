import { Router } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// POST /api/tasks/:taskId/dispatches - Create dispatch slip
router.post('/tasks/:taskId/dispatches', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { taskId } = req.params;
    const user = req.user;
    const {
      ctrlNo,
      dispatchDate,
      establishments,
      locations,
      purposes,
      othersPurpose,
      timeOfArrival,
      teamLeader,
      teamMembers,
      driver,
      vehiclePlateNumber,
      recommendedBy,
      approvedBy,
      status,
    } = req.body;

    if (!ctrlNo || !dispatchDate || !teamLeader) {
      return res.status(400).json({ error: 'Control No, Dispatch Date, and Team Leader are required.' });
    }

    await connection.beginTransaction();

    // Check task exists
    const [taskRows]: [any[], any] = await connection.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (taskRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Task not found' });
    }

    const dispatchId = `DSP-${Date.now()}`;
    const initialStatus = status || 'Pending Regional Supervisor Approval';

    await connection.query(
      `INSERT INTO dispatch_slips (
        id, task_id, ctrl_no, dispatch_date,
        purpose_inspection, purpose_pms, purpose_meeting, purpose_investigation, purpose_destruction,
        others_purpose, time_of_arrival, team_leader, team_members, driver, vehicle_plate_number,
        recommended_by_name, recommended_by_title, approved_by_name, approved_by_title,
        status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dispatchId,
        taskId,
        ctrlNo,
        dispatchDate,
        purposes?.inspection ? 1 : 0,
        purposes?.postMarketSurveillance ? 1 : 0,
        purposes?.attendanceToMeeting ? 1 : 0,
        purposes?.investigation ? 1 : 0,
        purposes?.witnessForDestruction ? 1 : 0,
        othersPurpose || 'N/A',
        timeOfArrival || '',
        teamLeader,
        teamMembers || '',
        driver || 'HANNIBAL C. ECOBEN',
        vehiclePlateNumber || 'AVANZA SAB 9141',
        recommendedBy?.name !== undefined ? recommendedBy.name : (initialStatus === 'Pending ODDG Approval' ? 'JON JOSEPH H. MEDRANO' : ''),
        recommendedBy?.title !== undefined ? recommendedBy.title : (initialStatus === 'Pending ODDG Approval' ? 'Executive Assistant III, ODDG-FROO' : ''),
        approvedBy?.name !== undefined ? approvedBy.name : (initialStatus === 'Pending ODDG Approval' ? 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV' : ''),
        approvedBy?.title !== undefined ? approvedBy.title : (initialStatus === 'Pending ODDG Approval' ? 'Deputy Director General - Field Regulatory Operations Office' : ''),
        initialStatus,
        user?.id || null,
      ]
    );

    // Insert destinations
    const estList = Array.isArray(establishments) ? establishments : [];
    const locList = Array.isArray(locations) ? locations : [];
    const maxLen = Math.max(estList.length, locList.length, 1);

    for (let i = 0; i < maxLen; i++) {
      const estName = estList[i] || 'Designated Facility';
      const locAddr = locList[i] || 'Field Jurisdiction';
      await connection.query(
        `INSERT INTO dispatch_slip_destinations (dispatch_slip_id, sequence_no, establishment_name, location_address)
         VALUES (?, ?, ?, ?)`,
        [dispatchId, i + 1, estName, locAddr]
      );
    }

    // Add activity to task
    const creatorName = user ? `${user.firstName} ${user.lastName}` : 'Authorized Personnel';
    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        `Dispatch Slip Created: ${ctrlNo}`,
        creatorName,
        user?.office || 'ODDG-FROO',
        user?.id || null,
        `Official travel order generated for ${teamLeader}. Initial status: ${initialStatus}.`,
        taskRows[0].status,
      ]
    );

    // Audit log
    if (user) {
      await connection.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'DISPATCH_CREATED',
          user.id,
          user.email,
          user.role,
          `Generated dispatch slip ${ctrlNo} for task ${taskId}.`,
          dispatchId,
          ctrlNo,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      id: dispatchId,
      taskId,
      ctrlNo,
      status: initialStatus,
      message: 'Dispatch slip created successfully',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Create dispatch error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A dispatch slip with this Control Number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create dispatch slip' });
  } finally {
    connection.release();
  }
});

// POST /api/dispatches/:id/approve - Approve dispatch slip
router.post('/dispatches/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Active session required' });
    }

    // CRITICAL RBAC RULE: STANDARD and RANK_AND_FILE accounts cannot approve dispatch
    const userRole = (user.role || '').toUpperCase();
    if (userRole === 'STANDARD' || userRole === 'RANK_AND_FILE') {
      return res.status(403).json({
        error: 'Standard officers are restricted from approving dispatch slips. Supervisor or Admin authority required.',
      });
    }

    await connection.beginTransaction();

    const [rows]: [any[], any] = await connection.query('SELECT * FROM dispatch_slips WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Dispatch slip not found' });
    }

    const ds = rows[0];

    // Determine next workflow status:
    // Standard Dispatch (Pending Regional Supervisor Approval) -> Approved by RS / CD / Admin / Superadmin
    // RS and CD Dispatch (Pending ODDG Approval) -> Approved by ODDG Admin / Superadmin
    const nextStatus = 'Approved';

    // CRITICAL RULE: In approval, do NOT change the signatory name and position!
    // Keep ds.approved_by_name and ds.approved_by_title intact.
    await connection.query(
      `UPDATE dispatch_slips
       SET status = ?,
           approved_by_user_id = ?
       WHERE id = ?`,
      [nextStatus, user.id, id]
    );

    const approverName = `${user.firstName} ${user.lastName}`;
    // Task activity log
    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ds.task_id,
        `Dispatch Slip Approved: ${ds.ctrl_no}`,
        approverName,
        user.office,
        user.id,
        `Dispatch order approved by ${approverName} (${userRole}). Status updated to ${nextStatus}.`,
      ]
    );

    // System audit log
    await connection.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'DISPATCH_APPROVED',
        user.id,
        user.email,
        user.role,
        `Approved dispatch slip ${ds.ctrl_no} for task ${ds.task_id}. Updated to ${nextStatus}.`,
        id,
        ds.ctrl_no,
      ]
    );

    await connection.commit();

    res.json({ success: true, id, status: nextStatus });
  } catch (error) {
    await connection.rollback();
    console.error('Approve dispatch error:', error);
    res.status(500).json({ error: 'Failed to approve dispatch slip' });
  } finally {
    connection.release();
  }
});

// POST /api/dispatches/:id/reject - Reject dispatch slip
router.post('/dispatches/:id/reject', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Active session required' });
    }

    const userRole = (user.role || '').toUpperCase();
    if (userRole === 'STANDARD' || userRole === 'RANK_AND_FILE') {
      return res.status(403).json({
        error: 'Standard officers are restricted from rejecting dispatch slips.',
      });
    }

    await connection.beginTransaction();

    const [rows]: [any[], any] = await connection.query('SELECT * FROM dispatch_slips WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Dispatch slip not found' });
    }

    const ds = rows[0];

    await connection.query(
      `UPDATE dispatch_slips
       SET status = 'Rejected',
           rejection_reason = ?
       WHERE id = ?`,
      [rejectionReason || 'Requires revision by inspectorate team.', id]
    );

    const reviewerName = `${user.firstName} ${user.lastName}`;
    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ds.task_id,
        `Dispatch Slip Rejected: ${ds.ctrl_no}`,
        reviewerName,
        user.office,
        user.id,
        `Dispatch slip rejected: ${rejectionReason || 'Requires revision'}.`,
      ]
    );

    await connection.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'DISPATCH_REJECTED',
        user.id,
        user.email,
        user.role,
        `Rejected dispatch slip ${ds.ctrl_no} (Reason: ${rejectionReason || 'Requires revision'}).`,
        id,
        ds.ctrl_no,
      ]
    );

    await connection.commit();

    res.json({ success: true, id, status: 'Rejected' });
  } catch (error) {
    await connection.rollback();
    console.error('Reject dispatch error:', error);
    res.status(500).json({ error: 'Failed to reject dispatch slip' });
  } finally {
    connection.release();
  }
});

// DELETE /api/dispatches/:id
router.delete('/dispatches/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM dispatch_slips WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete dispatch error:', error);
    res.status(500).json({ error: 'Failed to delete dispatch slip' });
  }
});

export default router;
