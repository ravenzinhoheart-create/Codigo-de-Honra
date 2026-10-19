// Código de Honra — registro de dispositivo Android / FCM
import { supabase } from './supabase.js';
import { getSession } from '../core/session.js';

function nativePlugin(){ return window.Capacitor?.Plugins?.MotoclubeNative || null; }

export async function registerPushToken(userId = getSession()?.user?.id) {
  if (!userId) return null;
  const plugin = nativePlugin();
  if (!plugin?.getFcmToken) return null;

  try {
    const permission = await plugin.getNotificationPermission?.();
    if (permission?.permission !== 'granted') {
      const requested = await plugin.requestNotificationPermission?.();
      if (!['granted','requested'].includes(requested?.permission)) return null;
      if (requested?.permission === 'requested') {
        let check = await plugin.getNotificationPermission?.();
        for (let i = 0; i < 20 && check?.permission !== 'granted'; i++) {
          if (check?.permission === 'denied') return null;
          await new Promise(resolve => setTimeout(resolve, 500));
          check = await plugin.getNotificationPermission?.();
        }
        if (check?.permission !== 'granted') return null;
      }
    }

    const { token } = await plugin.getFcmToken();
    if (!token) return null;

    const { data, error } = await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: 'android', enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'token' })
      .select('id,token')
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[PUSH] Não foi possível registrar o dispositivo:', error);
    return null;
  }
}

export async function disableCurrentPushToken() {
    const plugin = nativePlugin();
    if (!plugin?.getFcmToken) return;

    try {
        const { token } = await plugin.getFcmToken();

        if (token) {
            const { error } = await supabase
                .from('push_tokens')
                .delete()
                .eq('token', token);

            if (error) throw error;

            console.log('[PUSH] Token FCM removido no logout.');
        }
    } catch (error) {
        console.warn('[PUSH] Falha ao remover token:', error);
    }
}

