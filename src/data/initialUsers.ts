import { UserAccount } from '../types/auth';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-superadmin',
    username: 'amldelgado',
    password: 'password123',
    email: 'amldelgado@fda.gov.ph',
    firstName: 'Andrei Manuel',
    middleInitial: 'L.',
    lastName: 'Delgado',
    position: 'IT Developer',
    office: 'ODDG-FROO',
    role: 'SUPERADMIN',
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
    lastLogin: '2026-10-26 09:30 AM',
    lastActivity: 'Active in System Console',
  },
];

