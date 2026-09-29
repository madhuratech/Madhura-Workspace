import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configure how notifications are presented when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register push token with backend
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Madhura Workspace Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ffca22',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NOTIFICATIONS] Permission not granted by user');
      return null;
    }

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b31ac4be-0c97-4eda-9566-6db834641f93',
      });
      token = pushTokenData.data;
      console.log('[NOTIFICATIONS] Registered Expo Push Token:', token);

      // Save token in AsyncStorage
      await AsyncStorage.setItem('expo_push_token', token);

      // Sync with backend
      await axios.put('/users/push-token', { pushToken: token }).catch(err => {
        console.log('[NOTIFICATIONS] Syncing token with server error:', err.message);
      });
    } catch (e) {
      console.log('[NOTIFICATIONS] Error getting push token:', e.message);
    }
  } else {
    console.log('[NOTIFICATIONS] Push notifications require a physical device');
  }

  return token;
}

/**
 * Check if notifications are currently muted
 */
export async function isNotificationsMuted() {
  try {
    const mutedUntilStr = await AsyncStorage.getItem('muted_until');
    if (!mutedUntilStr) return false;
    const mutedUntil = new Date(mutedUntilStr);
    return mutedUntil > new Date();
  } catch (e) {
    return false;
  }
}

/**
 * Set notification mute duration ('8h', '24h', '1w', 'always', 'unmute')
 */
export async function setMuteNotifications(duration) {
  try {
    let mutedUntil = null;
    const now = new Date();

    if (duration === '8h') {
      mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    } else if (duration === '24h') {
      mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (duration === '1w') {
      mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (duration === 'always') {
      mutedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else if (duration === 'unmute') {
      mutedUntil = null;
    }

    if (mutedUntil) {
      await AsyncStorage.setItem('muted_until', mutedUntil.toISOString());
    } else {
      await AsyncStorage.removeItem('muted_until');
    }

    // Sync with backend
    await axios.put('/users/mute-notifications', { duration });
    return { success: true, mutedUntil };
  } catch (e) {
    console.error('[NOTIFICATIONS] Mute error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Schedule or show local instant notification (WhatsApp/Instagram style)
 */
export async function showLocalNotification({ title, body, data = {} }) {
  const isMuted = await isNotificationsMuted();
  if (isMuted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Madhura Workspace',
      body: body || '',
      data,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      badge: 1,
    },
    trigger: null, // show immediately
  });
}
