import { BankStatementAnalysis, HomeCriteria, PublicUser, StoredUser, UserProfile } from '../types';

const USERS_KEY = 'homepath_users';
const SESSION_KEY = 'homepath_session';

const isBrowser = () => typeof window !== 'undefined';

const getLocalStorage = () => (isBrowser() ? window.localStorage : null);
const getSessionStorage = () => (isBrowser() ? window.sessionStorage : null);

const readUsers = (): StoredUser[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch (error) {
    console.warn('Unable to read stored users:', error);
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(USERS_KEY, JSON.stringify(users));
};

const sanitizeUser = (user: StoredUser): PublicUser => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const hashPassword = (password: string) => {
  if (!isBrowser()) return password;
  try {
    return window.btoa(unescape(encodeURIComponent(password)));
  } catch {
    return window.btoa(password);
  }
};

const verifyPassword = (password: string, hash: string) => hashPassword(password) === hash;

const persistSession = (userId: string, remember = true) => {
  if (!isBrowser()) return;
  const persistentStore = remember ? getLocalStorage() : getSessionStorage();
  persistentStore?.setItem(SESSION_KEY, userId);
};

const getSessionUserId = (): string | null => {
  if (!isBrowser()) return null;
  const storages = [getLocalStorage(), getSessionStorage()];
  for (const store of storages) {
    const value = store?.getItem(SESSION_KEY);
    if (value) return value;
  }
  return null;
};

const removeSession = () => {
  if (!isBrowser()) return;
  getLocalStorage()?.removeItem(SESSION_KEY);
  getSessionStorage()?.removeItem(SESSION_KEY);
};

const generateId = () => {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `user_${Date.now()}`;
};

interface RegistrationPayload {
  fullName: string;
  email: string;
  password: string;
  profile: UserProfile;
  criteria: HomeCriteria;
  bankAnalysis: BankStatementAnalysis | null;
  totalBalance: number | null;
}

export const registerUser = async (payload: RegistrationPayload): Promise<PublicUser> => {
  if (!isBrowser()) {
    throw new Error('Registration is only available in the browser.');
  }

  const email = payload.email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((user) => user.email === email)) {
    throw new Error('An account with that email already exists.');
  }

  const newUser: StoredUser = {
    id: generateId(),
    fullName: payload.fullName.trim(),
    email,
    passwordHash: hashPassword(payload.password),
    profile: payload.profile,
    criteria: payload.criteria,
    bankAnalysis: payload.bankAnalysis,
    totalBalance: payload.totalBalance,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);
  persistSession(newUser.id, true);

  return sanitizeUser(newUser);
};

export const authenticateUser = async (
  email: string,
  password: string,
  remember = true,
): Promise<PublicUser> => {
  if (!isBrowser()) {
    throw new Error('Authentication is only available in the browser.');
  }

  const users = readUsers();
  const user = users.find((item) => item.email === email.trim().toLowerCase());

  if (!user) {
    throw new Error('No account found for that email.');
  }

  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Incorrect password.');
  }

  persistSession(user.id, remember);
  return sanitizeUser(user);
};

export const getCurrentUser = (): PublicUser | null => {
  const userId = getSessionUserId();
  if (!userId) return null;

  const users = readUsers();
  const user = users.find((item) => item.id === userId);
  return user ? sanitizeUser(user) : null;
};

export const signOutUser = () => {
  removeSession();
};

export const persistAuthenticatedState = (
  userId: string,
  updates: {
    profile?: UserProfile;
    criteria?: HomeCriteria;
    bankAnalysis?: BankStatementAnalysis | null;
    totalBalance?: number | null;
  },
): PublicUser | null => {
  const users = readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  const updatedUser: StoredUser = {
    ...users[index],
    profile: updates.profile ?? users[index].profile,
    criteria: updates.criteria ?? users[index].criteria,
    bankAnalysis: updates.bankAnalysis ?? users[index].bankAnalysis,
    totalBalance: updates.totalBalance ?? users[index].totalBalance,
  };

  users[index] = updatedUser;
  writeUsers(users);

  return sanitizeUser(updatedUser);
};
