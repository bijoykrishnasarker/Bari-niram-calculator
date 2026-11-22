import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { hasSupabaseConfig, mobileConfig } from '../config';
import { LargeSecureStore } from './secureSessionStorage';

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(
      mobileConfig.supabaseUrl,
      mobileConfig.supabasePublishableKey,
      {
        auth: {
          storage: new LargeSecureStore(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    )
  : null;
