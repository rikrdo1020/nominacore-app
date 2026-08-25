import type { User, UserRole } from '../../types/api';

export function getUsers(): Promise<User[]> {
  return window.api.getUsers();
}

export function createUser(dto: {
  username: string;
  password: string;
  role?: UserRole;
}): Promise<{ id: number; username: string; role: UserRole }> {
  return window.api.createUser(dto);
}

export function deleteUser(id: number): Promise<{ success: boolean }> {
  return window.api.deleteUser(id);
}
