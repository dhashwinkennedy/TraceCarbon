import apiClient from './api';
import { LoginResponse, User } from '../types';

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    return apiClient.post('/auth/login', credentials);
  },

  async getMe(): Promise<User> {
    return apiClient.get('/auth/me');
  },

  async changePassword(data: { old_password: string; new_password: string }): Promise<{ message: string }> {
    return apiClient.post('/auth/change-password', data);
  },

  logout(): void {
    sessionStorage.removeItem('scope3track_token');
    sessionStorage.removeItem('scope3track_user');
  },
};
