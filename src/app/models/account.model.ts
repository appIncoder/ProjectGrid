export type ProfileType = 'standard' | 'manager' | 'admin' | 'guest';
export type AccountRole = 'User' | 'PMO' | 'Admin' | 'Viewer';

export type AccountModel = {
  avatarDataUrl?: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AccountRole;
  profileType: ProfileType;
  passwordLastChangedAt?: string;
};
