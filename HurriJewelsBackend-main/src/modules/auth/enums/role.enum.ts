export enum Role {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  USER = 'USER',
  GUEST = 'GUEST',
}

export const ROLE_HIERARCHY = {
  [Role.ADMIN]: 3,
  [Role.VENDOR]: 2,
  [Role.USER]: 1,
  [Role.GUEST]: 0,
};

export const hasRolePermission = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole?.toUpperCase() as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole?.toUpperCase() as Role] ?? 0;
  return userLevel >= requiredLevel;
};
