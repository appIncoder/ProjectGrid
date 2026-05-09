export type AuthUser = {
  id: string;
  username: string;
  label: string;
};

export type LoginOptions = {
  remember?: boolean;
};

export interface AuthBackend {
  login(username: string, password: string, options?: LoginOptions): Promise<AuthUser | null>;
  logout(): Promise<void> | void;
  restoreSession?(): Promise<AuthUser | null>;
}
