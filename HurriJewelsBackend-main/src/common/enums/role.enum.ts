export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VENDOR = 'VENDOR',
  USER = 'USER',
}

export const ROLE_HIERARCHY = {
  [Role.SUPER_ADMIN]: 5,
  [Role.ADMIN]: 4,
  [Role.MANAGER]: 3,
  [Role.VENDOR]: 2,
  [Role.USER]: 1,
} as const;

export const ROLE_CREATION_RULES = {
  [Role.SUPER_ADMIN]: [Role.ADMIN], // Can create ADMIN users
  [Role.ADMIN]: [Role.MANAGER], // Can create MANAGER users
  [Role.MANAGER]: [], // Cannot create other users
  [Role.VENDOR]: [Role.ADMIN, Role.MANAGER], // Can create their own ADMIN and MANAGER
  [Role.USER]: [], // Cannot create other users
} as const;

export const ROLE_SCOPES = {
  [Role.SUPER_ADMIN]: 'GLOBAL', // Global access
  [Role.ADMIN]: 'GLOBAL', // Global access
  [Role.MANAGER]: 'SCOPED', // Scoped to vendor or category
  [Role.VENDOR]: 'OWN', // Own resources only
  [Role.USER]: 'OWN', // Own resources only
} as const;
