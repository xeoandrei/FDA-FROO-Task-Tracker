import { Router } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

// Helper to fetch full task details with activities and dispatch slips
async function fetchTaskById(taskId: string): Promise<any | null> {
  const [taskRows]: [any[], any] = await pool.query(
    `SELECT t.*,
            u_assigned.first_name AS assigned_first_name,
            u_assigned.last_name AS assigned_last_name,
            u_assigned.email AS assigned_email,
            u_assigned.position AS assigned_position,
            u_received.first_name AS received_first_name,
            u_received.last_name AS received_last_name,
            u_received.position AS received_position,
            u_received.office_code AS received_office,
            u_completed.first_name AS completed_first_name,
            u_completed.last_name AS completed_last_name,
            u_created.first_name AS created_first_name,
            u_created.last_name AS created_last_name
     FROM tasks t
     LEFT JOIN users u_assigned ON t.assigned_to_user_id = u_assigned.id
     LEFT JOIN users u_received ON t.received_by_user_id = u_received.id
     LEFT JOIN users u_completed ON t.completed_by_user_id = u_completed.id
     LEFT JOIN users u_created ON t.created_by_user_id = u_created.id
     WHERE t.id = ?`,
    [taskId]
  );

  if (taskRows.length === 0) return null;
  const t = taskRows[0];

  // Fetch activity logs
  const [activityRows]: [any[], any] = await pool.query(
    `SELECT id, action, actor_name, actor_office, notes, new_status, created_at
     FROM task_activity_logs
     WHERE task_id = ?
     ORDER BY created_at DESC, id DESC`,
    [taskId]
  );

  // Fetch dispatch slips
  const [dispatchRows]: [any[], any] = await pool.query(
    `SELECT d.*,
            u_appr.first_name AS approver_first_name,
            u_appr.last_name AS approver_last_name,
            u_create.first_name AS creator_first_name,
            u_create.last_name AS creator_last_name,
            u_create.email AS creator_email,
            u_create.role_code AS creator_role
     FROM dispatch_slips d
     LEFT JOIN users u_appr ON d.approved_by_user_id = u_appr.id
     LEFT JOIN users u_create ON d.created_by_user_id = u_create.id
     WHERE d.task_id = ?
     ORDER BY d.created_at DESC`,
    [taskId]
  );

  // Fetch destinations for all dispatch slips of this task
  const dispatchSlips = [];
  for (const ds of dispatchRows) {
    const [destRows]: [any[], any] = await pool.query(
      `SELECT establishment_name, location_address
       FROM dispatch_slip_destinations
       WHERE dispatch_slip_id = ?
       ORDER BY sequence_no ASC`,
      [ds.id]
    );

    dispatchSlips.push({
      id: ds.id,
      taskId: ds.task_id,
      ctrlNo: ds.ctrl_no,
      dispatchDate: ds.dispatch_date,
      establishments: destRows.map((d: any) => d.establishment_name),
      locations: destRows.map((d: any) => d.location_address),
      purposes: {
        inspection: Boolean(ds.purpose_inspection),
        postMarketSurveillance: Boolean(ds.purpose_pms),
        attendanceToMeeting: Boolean(ds.purpose_meeting),
        investigation: Boolean(ds.purpose_investigation),
        witnessForDestruction: Boolean(ds.purpose_destruction),
      },
      othersPurpose: ds.others_purpose || 'N/A',
      timeOfArrival: ds.time_of_arrival || '',
      teamLeader: ds.team_leader,
      teamMembers: ds.team_members,
      driver: ds.driver,
      vehiclePlateNumber: ds.vehicle_plate_number,
      recommendedBy: {
        name: ds.recommended_by_name,
        title: ds.recommended_by_title,
      },
      approvedBy: {
        name: ds.approved_by_name,
        title: ds.approved_by_title,
        signedBy: ds.approver_first_name ? `${ds.approver_first_name} ${ds.approver_last_name}` : undefined,
      },
      status: ds.status,
      createdAt: ds.created_at,
      createdBy: ds.creator_first_name ? `${ds.creator_first_name} ${ds.creator_last_name}` : undefined,
      createdByUserEmail: ds.creator_email,
      createdByUserRole: ds.creator_role,
      rejectionReason: ds.rejection_reason || undefined,
    });
  }

  const assignedFullName = t.assigned_first_name
    ? `${t.assigned_first_name} ${t.assigned_last_name}`
    : 'Unassigned';

  const receivedByText = t.received_first_name
    ? `${t.received_first_name} ${t.received_last_name} (${t.received_position || 'Staff'}, ${t.received_office || t.region})`
    : undefined;

  const completedByText = t.completed_first_name
    ? `${t.completed_first_name} ${t.completed_last_name}`
    : undefined;

  const createdByText = t.created_first_name
    ? `${t.created_first_name} ${t.created_last_name}`
    : 'ODDG-FROO System';

  return {
    id: t.id,
    dtn: t.dtn,
    taskTitle: t.task_title,
    category: t.category,
    origin: t.origin,
    originDetails: t.origin_details || undefined,
    assignedTo: assignedFullName,
    assignedOffice: t.assigned_office_code,
    assignedUserEmail: t.assigned_email,
    region: t.region,
    dueDate: t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : '',
    scheduledDate: t.scheduled_date ? new Date(t.scheduled_date).toISOString().split('T')[0] : undefined,
    location: t.location,
    description: t.description,
    outcome: t.outcome,
    remarks: t.remarks || undefined,
    status: t.status,
    priority: t.priority,
    createdAt: t.created_at,
    createdBy: createdByText,
    receivedAt: t.received_at ? new Date(t.received_at).toISOString() : undefined,
    receivedBy: receivedByText,
    completedAt: t.completed_at ? new Date(t.completed_at).toISOString() : undefined,
    completedBy: completedByText,
    activityHistory: activityRows.map((a: any) => ({
      id: String(a.id),
      action: a.action,
      actor: a.actor_name,
      actorOffice: a.actor_office || undefined,
      date: new Date(a.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      notes: a.notes || undefined,
      newStatus: a.new_status || undefined,
    })),
    dispatchSlips,
  };
}

// GET /api/tasks - list tasks
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const [rows]: [any[], any] = await pool.query('SELECT id FROM tasks ORDER BY created_at DESC');

    const tasks = [];
    for (const r of rows) {
      const task = await fetchTaskById(r.id);
      if (task) {
        tasks.push(task);
      }
    }

    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to retrieve tasks from database' });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await fetchTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to retrieve task details' });
  }
});

// POST /api/tasks - create new task with 14-digit locked DTN
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      taskTitle,
      category,
      origin,
      originDetails,
      assignedTo,
      assignedToUserId,
      region,
      dueDate,
      scheduledDate,
      location,
      description,
      priority,
      dtn,
    } = req.body;

    // Validate 14-digit DTN
    if (!dtn || !/^[0-9]{14}$/.test(String(dtn).trim())) {
      return res.status(400).json({ error: 'DTN (Document Tracking Number) must be exactly 14 digits.' });
    }

    if (!taskTitle || !category || !origin || !region || !dueDate) {
      return res.status(400).json({ error: 'Task Title, Category, Origin, Region, and Due Date are required.' });
    }

    const cleanDtn = String(dtn).trim();
    const taskId = `FROO-TSK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    await connection.beginTransaction();

    // Check DTN uniqueness
    const [existingDtn]: [any[], any] = await connection.query('SELECT id FROM tasks WHERE dtn = ?', [cleanDtn]);
    if (existingDtn.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: `A task with DTN ${cleanDtn} already exists.` });
    }

    // Resolve assigned user id if not provided directly
    let targetUserId = assignedToUserId || null;
    if (!targetUserId && assignedTo) {
      const [uRows]: [any[], any] = await connection.query(
        `SELECT id FROM users
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) = ? OR LOWER(email) = ? OR id = ?
         LIMIT 1`,
        [assignedTo.toLowerCase().trim(), assignedTo.toLowerCase().trim(), assignedTo]
      );
      if (uRows.length > 0) {
        targetUserId = uRows[0].id;
      }
    }

    const actorId = req.user?.id || null;
    const actorName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'ODDG-FROO Administrator';
    const actorOffice = req.user?.office || 'ODDG-FROO';

    await connection.query(
      `INSERT INTO tasks (
        id, dtn, task_title, category, origin, origin_details,
        assigned_to_user_id, assigned_office_code, region, due_date,
        scheduled_date, location, description, outcome, status, priority, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Open', ?, ?)`,
      [
        taskId,
        cleanDtn,
        taskTitle.trim(),
        category,
        origin,
        originDetails || null,
        targetUserId,
        region,
        region,
        dueDate,
        scheduledDate || null,
        location || 'Field Office Jurisdiction',
        description || '',
        priority || 'Medium',
        actorId,
      ]
    );

    // Initial activity log
    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Open')`,
      [
        taskId,
        'Task created and registered in FROO Tracker',
        actorName,
        actorOffice,
        actorId,
        `Task assigned for field regulatory execution in ${region}. DTN: ${cleanDtn}`,
      ]
    );

    // System audit log
    if (req.user) {
      await connection.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'TASK_CREATED',
          req.user.id,
          req.user.email,
          req.user.role,
          `Operational task "${taskTitle}" (DTN: ${cleanDtn}) created in ${region}.`,
          taskId,
          taskTitle,
        ]
      );
    }

    await connection.commit();

    const createdTask = await fetchTaskById(taskId);
    res.status(201).json(createdTask);
  } catch (error: any) {
    await connection.rollback();
    console.error('Create task error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A task with this DTN already exists.' });
    }
    res.status(500).json({ error: 'Failed to create operational task' });
  } finally {
    connection.release();
  }
});

// POST /api/tasks/:id/receive - Receive and Accept Task
router.post('/:id/receive', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Active session required' });
    }

    await connection.beginTransaction();

    const [rows]: [any[], any] = await connection.query('SELECT * FROM tasks WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];

    // Prevent duplicate receipt
    if (task.received_at || task.status !== 'Open') {
      await connection.rollback();
      return res.status(400).json({
        error: `Task is already received. Duplicate acceptance is prevented. (Current status: ${task.status})`,
      });
    }

    // Role and regional authorization validation
    const userRole = (user.role || '').toUpperCase();
    const userOffice = (user.office || '').toLowerCase();
    const taskRegion = (task.region || '').toLowerCase();

    let authorized = false;
    if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
      authorized = true;
    } else if (userRole === 'CLUSTER_DIRECTOR') {
      authorized = true; // Cluster Directors have cluster-wide authority
    } else if (userRole === 'REGIONAL_SUPERVISOR') {
      authorized = userOffice.includes(taskRegion) || taskRegion.includes(userOffice);
    } else {
      // STANDARD staff: must be assigned to them or in same office
      authorized =
        task.assigned_to_user_id === user.id ||
        userOffice.includes(taskRegion) ||
        taskRegion.includes(userOffice);
    }

    if (!authorized) {
      await connection.rollback();
      return res.status(403).json({
        error: `You are not authorized to receive this task for region ${task.region}.`,
      });
    }

    const actorName = `${user.firstName} ${user.lastName}`;
    const actorOffice = user.office;

    // Update task
    await connection.query(
      `UPDATE tasks
       SET status = 'In Progress',
           received_at = NOW(),
           received_by_user_id = ?
       WHERE id = ?`,
      [user.id, id]
    );

    // Record activity log
    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
       VALUES (?, ?, ?, ?, ?, ?, 'In Progress')`,
      [
        id,
        'Task received and accepted into In-Progress execution.',
        actorName,
        actorOffice,
        user.id,
        `Official receipt recorded by ${actorName} (${user.role}, ${actorOffice}). Field regulatory operation initiated.`,
      ]
    );

    // Record system audit log
    await connection.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'TASK_RECEIVED',
        user.id,
        user.email,
        user.role,
        `Task "${task.task_title}" (DTN: ${task.dtn}) received and accepted by ${actorName}. Status updated to In Progress.`,
        id,
        task.task_title,
      ]
    );

    await connection.commit();

    const updatedTask = await fetchTaskById(id);
    res.json(updatedTask);
  } catch (error) {
    await connection.rollback();
    console.error('Receive task error:', error);
    res.status(500).json({ error: 'Failed to receive task' });
  } finally {
    connection.release();
  }
});

// POST /api/tasks/:id/complete - Complete task
router.post('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { outcome, remarks } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Active session required' });
    }

    await connection.beginTransaction();

    const [rows]: [any[], any] = await connection.query('SELECT * FROM tasks WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];
    const actorName = `${user.firstName} ${user.lastName}`;

    await connection.query(
      `UPDATE tasks
       SET status = 'Completed',
           outcome = ?,
           remarks = ?,
           completed_at = NOW(),
           completed_by_user_id = ?
       WHERE id = ?`,
      [outcome || 'Compliance Verified', remarks || null, user.id, id]
    );

    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
       VALUES (?, ?, ?, ?, ?, ?, 'Completed')`,
      [
        id,
        `Task concluded: ${outcome || 'Compliance Verified'}`,
        actorName,
        user.office,
        user.id,
        remarks || 'Task marked completed by operational officer.',
      ]
    );

    await connection.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'TASK_COMPLETED',
        user.id,
        user.email,
        user.role,
        `Task "${task.task_title}" completed with outcome: ${outcome || 'Compliance Verified'}.`,
        id,
        task.task_title,
      ]
    );

    await connection.commit();

    const updatedTask = await fetchTaskById(id);
    res.json(updatedTask);
  } catch (error) {
    await connection.rollback();
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  } finally {
    connection.release();
  }
});

// POST /api/tasks/:id/activity - Add progress update / activity log
router.post('/:id/activity', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { notes, newStatus, action } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Active session required' });
    }

    await connection.beginTransaction();

    const [rows]: [any[], any] = await connection.query('SELECT * FROM tasks WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];

    // Enforce Rule: Do not allow ordinary users to revert a received task to Open
    if (newStatus === 'Open' && task.received_at) {
      const role = (user.role || '').toUpperCase();
      if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
        await connection.rollback();
        return res.status(403).json({
          error: 'Only administrative supervisors can revert an officially received task back to Open.',
        });
      }
    }

    const actorName = `${user.firstName} ${user.lastName}`;

    if (newStatus && newStatus !== task.status) {
      await connection.query('UPDATE tasks SET status = ? WHERE id = ?', [newStatus, id]);
    }

    await connection.query(
      `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        action || 'Field Progress Update',
        actorName,
        user.office,
        user.id,
        notes || '',
        newStatus || task.status,
      ]
    );

    await connection.commit();

    const updatedTask = await fetchTaskById(id);
    res.json(updatedTask);
  } catch (error) {
    await connection.rollback();
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Failed to record activity log' });
  } finally {
    connection.release();
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows]: [any[], any] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];

    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

    if (user) {
      await pool.query(
        `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'TASK_DELETED',
          user.id,
          user.email,
          user.role,
          `Deleted operational task "${task.task_title}" (${task.region}).`,
          id,
          task.task_title,
        ]
      );
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
