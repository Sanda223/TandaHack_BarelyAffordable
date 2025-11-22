// Supabase stub to keep the build working without the actual SDK.
// In production with Supabase enabled, replace this file with a real
// `createClient` import from '@supabase/supabase-js' and proper environment keys.

const notAvailableError = () => new Error('Supabase is not configured in this build.');

export const supabase = {
  auth: {
    async signUp() {
      return { data: null, error: notAvailableError() };
    },
    async signInWithPassword() {
      return { data: null, error: notAvailableError() };
    },
    async signOut() {
      return { error: notAvailableError() };
    },
    async getUser() {
      return { data: { user: null }, error: notAvailableError() };
    },
  },
  from() {
    return {
      insert: async () => ({ data: null, error: notAvailableError() }),
      select: async () => ({ data: [], error: notAvailableError() }),
    };
  },
};
