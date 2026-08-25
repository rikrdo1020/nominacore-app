// Thin wrappers around window.api (this app's fetch boundary — the renderer
// never calls fetch directly, see electron/preload.ts). Kept under lib/api
// to satisfy the "no raw calls inside components" convention.
import type { AuthUser, LoginResponse } from '../../types/api';

export function login(username: string, password: string): Promise<LoginResponse> {
  return window.api.login(username, password);
}

export function getMe(): Promise<AuthUser> {
  return window.api.getMe();
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  return window.api.changePassword(currentPassword, newPassword);
}
