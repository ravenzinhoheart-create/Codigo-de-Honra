/*
 * Código de Honra — Android bridge adapter.
 *
 * O projeto continua executável na web. No APK, Capacitor injeta o plugin
 * nativo MotoclubeNative. Este arquivo transforma a API nativa em uma API
 * compatível com os módulos já existentes do projeto.
 */
(function installAndroidBridge(){
  const Capacitor = window.Capacitor;
  if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform() || typeof Capacitor.registerPlugin !== 'function') return;
  const plugin = Capacitor.registerPlugin('MotoclubeNative');
  if (!plugin) return;

  const toFile = (item) => {
    if (!item?.base64) return null;
    const binary = atob(item.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], item.name || `cdhmc-${Date.now()}.${item.mime?.includes('png')?'png':'jpg'}`, {
      type: item.mime || 'application/octet-stream',
      lastModified: Date.now()
    });
  };

  const notifications = {
    isSupported: () => true,
    getPermission: async () => (await plugin.getNotificationPermission()).permission,
    requestPermission: async () => (await plugin.requestNotificationPermission()).permission,
    ensurePermission: async () => (await plugin.requestNotificationPermission()).permission,
    getToken: async () => (await plugin.getFcmToken()).token,
    show: async (options={}) => plugin.showLocalNotification(options),
    notify: async (title, body='', options={}) => plugin.showLocalNotification({title, body, ...options}),
    notifySOS: async ({memberName='Membro', type='SOS', body='Um chamado SOS foi emitido.'}={}) => plugin.showLocalNotification({
      title: `SOS • ${type}`,
      body: `${memberName}: ${body}`,
      tag: 'motoclube-sos',
      critical: true
    })
  };

  const device = {
    init: async () => ({platform:'android', native:true}),
    getPlatform: () => 'android',
    getUserAgent: () => navigator.userAgent,
    getLanguage: () => navigator.language || 'pt-BR',
    getOnlineStatus: () => navigator.onLine,
    getScreen: () => ({width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio||1}),
    isNative: () => true,
    isAndroid: () => true,
    isIOS: () => false,
    isWeb: () => false,
    getInfo: () => ({platform:'android',native:true,language:navigator.language||'pt-BR',online:navigator.onLine,screen:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio||1},userAgent:navigator.userAgent}),
    openBatteryOptimizationSettings: () => plugin.openBatteryOptimizationSettings()
  };

  const vibration = {
    isSupported: () => true,
    vibrate: (pattern=100) => plugin.vibrate({pattern}),
    short: () => plugin.vibrate({pattern:60}),
    medium: () => plugin.vibrate({pattern:150}),
    long: () => plugin.vibrate({pattern:300}),
    sos: () => plugin.vibrate({pattern:[120,80,120,80,350]}),
    stop: () => plugin.vibrate({pattern:0}),
    init: async () => true
  };


  const microphone = { requestPermission: async () => (await plugin.requestMicrophonePermission()).permission };

  const communications = {
    pickContact: async () => plugin.pickContact(),
    dial: async (phone) => plugin.dial({phone}),
    composeSms: async (phone, body='') => plugin.composeSms({phone, body})
  };

  const gallery = {
    isSupported: () => true,
    pick: async ({multiple=false,accept='image/*'}={}) => {
      const result = await plugin.pickMedia({multiple,accept});
      return (result?.files||[]).map(toFile).filter(Boolean);
    }
  };

  const sos = {
    startTracking: (options={}) => plugin.startSosTracking(options),
    stopTracking: () => plugin.stopSosTracking()
  };

  const gps = {
    isSupported: () => true,
    getCurrentPosition: async (options={}) => {
      const p = await plugin.getCurrentPosition(options);
      return {coords:{latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy||0,altitude:p.altitude||null,heading:p.heading||null,speed:p.speed||null},timestamp:p.timestamp||Date.now()};
    },
    watchPosition: (onUpdate,onError,options={}) => {
      const id = `gps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      plugin.startLocationWatch({watchId:id,...options}).then(() => {
        window.addEventListener(`motoclube:gps:${id}`, e => onUpdate?.(e.detail));
      }).catch(onError);
      return id;
    },
    stopWatching: id => plugin.stopLocationWatch({watchId:id}),
    requestPermission: async () => (await plugin.requestLocationPermission()).permission,
    requestBackgroundPermission: async () => (await plugin.requestBackgroundLocationPermission()).permission,
    init: async () => true
  };

  window.MotoclubeNative = Object.freeze({notifications,device,vibration,camera,gallery,gps,microphone,communications,sos});
})();
