export type AuthUser = {
  id: string;
  username: string;
  label: string;
};

export interface AuthBackend {
  login(username: string, password: string): Promise<AuthUser | null>;
  logout(): Promise<void> | void;
  restoreSession?(): Promise<AuthUser | null>;
}
