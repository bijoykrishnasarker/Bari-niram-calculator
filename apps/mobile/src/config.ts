export const mobileConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
};

export const hasApiConfig = Boolean(mobileConfig.apiUrl);
export const hasSupabaseConfig = Boolean(
  mobileConfig.supabaseUrl && mobileConfig.supabasePublishableKey,
);
