-- ============================================================================
-- FDA FIELD REGULATORY OPERATIONS OFFICE (FROO) TASK TRACKER
-- SAFE INITIAL MySQL 8.0+ Relational DDL & Reference Seed Schema
-- Target: MySQL Workbench 8.0 CE / Docker MySQL 8.0 Container
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `froo_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `froo_db`;

-- SAFE INITIAL SETUP: no DROP TABLE statements.
-- This script is intended for a fresh `froo_db` database.
-- If a table already exists, CREATE TABLE IF NOT EXISTS preserves it as-is.


-- ----------------------------------------------------------------------------
-- 1. CLUSTERS (FROO Geographic Clusters: NLC, SLC, VBC, MOC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clusters` (
  `cluster_code` VARCHAR(20) NOT NULL,
  `cluster_name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cluster_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. OFFICES (ODDG-FROO and Regional Field Offices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `offices` (
  `office_code` VARCHAR(50) NOT NULL,
  `office_name` VARCHAR(150) NOT NULL,
  `cluster_code` VARCHAR(20) NULL,
  `office_type` ENUM('CENTRAL', 'REGIONAL', 'EXTERNAL') NOT NULL DEFAULT 'REGIONAL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`office_code`),
  CONSTRAINT `fk_offices_cluster`
    FOREIGN KEY (`cluster_code`) REFERENCES `clusters` (`cluster_code`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. ROLES (RBAC: SUPERADMIN, ADMIN, CLUSTER_DIRECTOR, REGIONAL_SUPERVISOR, STANDARD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `role_code` VARCHAR(50) NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `hierarchy_level` INT NOT NULL DEFAULT 1,
  `can_approve_dispatch` TINYINT(1) NOT NULL DEFAULT 0,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. USERS (FDA Officers, Supervisors, Directors, and Staff)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL,
  `username` VARCHAR(100) NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `middle_initial` VARCHAR(10) NULL,
  `position` VARCHAR(150) NOT NULL,
  `role_code` VARCHAR(50) NOT NULL,
  `office_code` VARCHAR(50) NOT NULL,
  `cluster_code` VARCHAR(20) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `last_activity` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role_code`),
  KEY `idx_users_office` (`office_code`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_code`) REFERENCES `roles` (`role_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_users_office`
    FOREIGN KEY (`office_code`) REFERENCES `offices` (`office_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_users_cluster`
    FOREIGN KEY (`cluster_code`) REFERENCES `clusters` (`cluster_code`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TASKS (Main Operational Tasks with 14-Digit Locked DTN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(50) NOT NULL,
  `dtn` CHAR(14) NOT NULL,
  `task_title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `origin` VARCHAR(100) NOT NULL,
  `origin_details` VARCHAR(255) NULL,
  `assigned_to_user_id` CHAR(36) NULL,
  `assigned_office_code` VARCHAR(50) NOT NULL,
  `region` VARCHAR(50) NOT NULL,
  `due_date` DATE NOT NULL,
  `scheduled_date` DATE NULL,
  `location` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `outcome` VARCHAR(100) NOT NULL DEFAULT 'Pending',
  `remarks` TEXT NULL,
  `status` ENUM('Open', 'In Progress', 'Completed', 'Overdue') NOT NULL DEFAULT 'Open',
  `priority` ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  `received_at` DATETIME NULL,
  `received_by_user_id` CHAR(36) NULL,
  `completed_at` DATETIME NULL,
  `completed_by_user_id` CHAR(36) NULL,
  `created_by_user_id` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tasks_dtn` (`dtn`),
  KEY `idx_tasks_status` (`status`),
  KEY `idx_tasks_region` (`region`),
  KEY `idx_tasks_assigned_user` (`assigned_to_user_id`),
  KEY `idx_tasks_assigned_office` (`assigned_office_code`),
  KEY `idx_tasks_due_date` (`due_date`),
  CONSTRAINT `chk_tasks_dtn_format` CHECK (`dtn` REGEXP '^[0-9]{14}$'),
  CONSTRAINT `fk_tasks_assigned_user`
    FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_assigned_office`
    FOREIGN KEY (`assigned_office_code`) REFERENCES `offices` (`office_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_received_user`
    FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_completed_user`
    FOREIGN KEY (`completed_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_created_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TASK ACTIVITY LOGS (Task History, Remarks & Workflow Audits)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` VARCHAR(50) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_office` VARCHAR(100) NULL,
  `actor_user_id` CHAR(36) NULL,
  `notes` TEXT NULL,
  `new_status` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_task` (`task_id`),
  CONSTRAINT `fk_activity_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_activity_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. DISPATCH SLIPS (Official FROO Travel and Inspection Orders)
-- Removed 'Dispatched'; signature date omitted per standard formatting rules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dispatch_slips` (
  `id` VARCHAR(50) NOT NULL,
  `task_id` VARCHAR(50) NOT NULL,
  `ctrl_no` VARCHAR(50) NOT NULL,
  `dispatch_date` VARCHAR(50) NOT NULL,
  `purpose_inspection` TINYINT(1) NOT NULL DEFAULT 0,
  `purpose_pms` TINYINT(1) NOT NULL DEFAULT 0,
  `purpose_meeting` TINYINT(1) NOT NULL DEFAULT 0,
  `purpose_investigation` TINYINT(1) NOT NULL DEFAULT 0,
  `purpose_destruction` TINYINT(1) NOT NULL DEFAULT 0,
  `others_purpose` VARCHAR(255) NOT NULL DEFAULT 'N/A',
  `time_of_arrival` VARCHAR(50) NOT NULL DEFAULT '',
  `team_leader` VARCHAR(150) NOT NULL,
  `team_members` TEXT NOT NULL,
  `driver` VARCHAR(150) NOT NULL DEFAULT 'HANNIBAL C. ECOBEN',
  `vehicle_plate_number` VARCHAR(50) NOT NULL DEFAULT 'AVANZA SAB 9141',
  `recommended_by_name` VARCHAR(150) NOT NULL,
  `recommended_by_title` VARCHAR(150) NOT NULL,
  `approved_by_name` VARCHAR(150) NOT NULL DEFAULT 'ATTY. FRANKLIN ANTHONY M. TABAQUIN, IV',
  `approved_by_title` VARCHAR(150) NOT NULL DEFAULT 'Deputy Director General - Field Regulatory Operations Office',
  `approved_by_user_id` CHAR(36) NULL,
  `status` ENUM(
    'Draft',
    'Pending Regional Supervisor Approval',
    'Pending ODDG Approval',
    'Approved',
    'Rejected'
  ) NOT NULL DEFAULT 'Pending Regional Supervisor Approval',
  `rejection_reason` TEXT NULL,
  `created_by_user_id` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dispatch_ctrl_no` (`ctrl_no`),
  KEY `idx_dispatch_task` (`task_id`),
  KEY `idx_dispatch_status` (`status`),
  CONSTRAINT `fk_dispatch_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_dispatch_approver`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_dispatch_creator`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. DISPATCH SLIP DESTINATIONS (Establishments & Locations with Sequence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dispatch_slip_destinations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dispatch_slip_id` VARCHAR(50) NOT NULL,
  `sequence_no` INT NOT NULL DEFAULT 1,
  `establishment_name` VARCHAR(255) NOT NULL,
  `location_address` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dest_slip` (`dispatch_slip_id`),
  CONSTRAINT `fk_dest_dispatch`
    FOREIGN KEY (`dispatch_slip_id`) REFERENCES `dispatch_slips` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. SYSTEM AUDIT LOGS (Immutable System Security & Regulatory Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(64) NOT NULL,
  `user_id` CHAR(36) NULL,
  `user_email` VARCHAR(191) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `target_entity_id` VARCHAR(100) NULL,
  `target_entity_name` VARCHAR(255) NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_event` (`event_type`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: Populating Baseline Clusters, Roles, Offices, and Master Users
-- ============================================================================

INSERT IGNORE INTO `clusters` (`cluster_code`, `cluster_name`, `description`) VALUES
('NLC', 'North Luzon Cluster', 'Ilocos Region, Cagayan Valley, Central Luzon, CAR'),
('SLC', 'South Luzon Cluster', 'CALABARZON, MIMAROPA, Bicol Region, NCR'),
('VBC', 'Visayas Cluster', 'Western, Central, and Eastern Visayas'),
('MOC', 'Mindanao Cluster', 'Zamboanga Peninsula, Northern Mindanao, Davao, SOCCSKSARGEN, Caraga, BARMM');

INSERT IGNORE INTO `roles` (`role_code`, `role_name`, `hierarchy_level`, `can_approve_dispatch`, `description`) VALUES
('SUPERADMIN', 'Super Administrator', 1, 1, 'Complete system-wide supervisory, user management, and override authority'),
('ADMIN', 'ODDG-FROO Executive Admin', 2, 1, 'Deputy Director General office administrator with approval authority'),
('CLUSTER_DIRECTOR', 'Cluster Director', 3, 1, 'Executive Director supervising Regional Field Offices across a cluster'),
('REGIONAL_SUPERVISOR', 'Regional Field Supervisor', 4, 1, 'Supervisor authorizing regional inspection assignments and dispatches'),
('STANDARD', 'Field Regulatory Operations Officer', 5, 0, 'Field inspector / staff officer restricted from dispatch slip approvals');

INSERT IGNORE INTO `offices` (`office_code`, `office_name`, `cluster_code`, `office_type`) VALUES
('ODDG-FROO', 'Office of the Deputy Director General - FROO', NULL, 'CENTRAL'),
('NLC', 'North Luzon Cluster Office (NLC)', 'NLC', 'REGIONAL'),
('SLC', 'South Luzon Cluster Office (SLC)', 'SLC', 'REGIONAL'),
('VBC', 'Visayas Cluster Office (VBC)', 'VBC', 'REGIONAL'),
('MOC', 'Mindanao Cluster Office (MOC)', 'MOC', 'REGIONAL'),
('North Luzon Cluster (NLC)', 'North Luzon Cluster (NLC)', 'NLC', 'REGIONAL'),
('South Luzon Cluster (SLC)', 'South Luzon Cluster (SLC)', 'SLC', 'REGIONAL'),
('Visayas Cluster (VC)', 'Visayas Cluster (VC)', 'VBC', 'REGIONAL'),
('Mindanao Cluster (MOC)', 'Mindanao Cluster (MOC)', 'MOC', 'REGIONAL'),
('Region NCR', 'Regional Field Office - NCR', 'SLC', 'REGIONAL'),
('Region 1', 'Regional Field Office - Ilocos Region (Region 1)', 'NLC', 'REGIONAL'),
('Region 2', 'Regional Field Office - Cagayan Valley (Region 2)', 'NLC', 'REGIONAL'),
('Region 3', 'Regional Field Office - Central Luzon (Region 3)', 'NLC', 'REGIONAL'),
('Region 4A', 'Regional Field Office - CALABARZON (Region 4A)', 'SLC', 'REGIONAL'),
('Region 4B', 'Regional Field Office - MIMAROPA (Region 4B)', 'SLC', 'REGIONAL'),
('Region 5', 'Regional Field Office - Bicol Region (Region 5)', 'SLC', 'REGIONAL'),
('Region 6', 'Regional Field Office - Western Visayas (Region 6)', 'VBC', 'REGIONAL'),
('Region 7', 'Regional Field Office - Central Visayas (Region 7)', 'VBC', 'REGIONAL'),
('Region 8', 'Regional Field Office - Eastern Visayas (Region 8)', 'VBC', 'REGIONAL'),
('Region 9', 'Regional Field Office - Zamboanga Peninsula (Region 9)', 'MOC', 'REGIONAL'),
('Region 10', 'Regional Field Office - Northern Mindanao (Region 10)', 'MOC', 'REGIONAL'),
('Region 11', 'Regional Field Office - Davao Region (Region 11)', 'MOC', 'REGIONAL'),
('Region 12', 'Regional Field Office - SOCCSKSARGEN (Region 12)', 'MOC', 'REGIONAL'),
('CARAGA', 'Regional Field Office - Caraga (Region 13)', 'MOC', 'REGIONAL'),
('CAR', 'Regional Field Office - Cordillera Administrative Region', 'NLC', 'REGIONAL'),
('BARMM', 'Regional Field Office - BARMM', 'MOC', 'REGIONAL');

-- SECURITY: No sample user accounts are seeded by this script.
-- Create real users through a backend/admin provisioning process using a verified
-- bcrypt/Argon2 password hash. Do not reuse placeholder hashes or default passwords.
