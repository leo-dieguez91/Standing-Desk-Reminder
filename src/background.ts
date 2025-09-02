/// <reference lib="WebWorker" />
export {}

declare const self: ServiceWorkerGlobalScope

// Definir tipos para variables de entorno de Vite
interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string
  readonly VITE_BACKEND_SUBSCRIBE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// ====== TIPOS ======
interface ScheduleItem {
  time: string;
  action: 'standing' | 'sitting';
  enabled: boolean;
}

interface ExtensionSettings {
  notificationType: 'system' | 'alert' | 'both';
  workDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  workHours: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

// ====== CONFIG ======
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ?? ""
const BACKEND_SUBSCRIBE_URL = (import.meta as any).env?.VITE_BACKEND_SUBSCRIBE_URL ?? ""

const defaultSchedule: ScheduleItem[] = [
  { time: "09:00", action: "sitting", enabled: true },
  { time: "11:00", action: "standing", enabled: true },
  { time: "14:00", action: "sitting", enabled: true }
];

const defaultSettings = {
  notificationType: 'both' as 'system' | 'alert' | 'both',
  workDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true
  },
  workHours: {
    start: '09:00',
    end: '18:00',
    enabled: false
  }
};

// ====== HELPERS ======
function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// Verificar si las notificaciones deben mostrarse según días y horarios
function shouldShowNotification(settings: ExtensionSettings): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = domingo, 1 = lunes, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // tiempo en minutos
  
  // Verificar si la configuración tiene la estructura completa
  if (!settings.workDays || !settings.workHours) {
    console.log('⚠️ Configuración incompleta, usando configuración por defecto');
    settings = { ...settings, ...defaultSettings };
  }
  
  // Verificar día de la semana
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = dayNames[currentDay];
  
  if (!settings.workDays[currentDayName as keyof typeof settings.workDays]) {
    console.log(`❌ Notificación bloqueada: ${currentDayName} no está habilitado`);
    return false;
  }
  
  // Verificar horario de trabajo si está habilitado
  if (settings.workHours && settings.workHours.enabled) {
    const [startHour, startMin] = settings.workHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.workHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (currentTime < startTime || currentTime > endTime) {
      console.log(`❌ Notificación bloqueada: fuera del horario de trabajo (${settings.workHours.start} - ${settings.workHours.end})`);
      return false;
    }
  }
  
  console.log(`✅ Notificación permitida: ${currentDayName} dentro del horario`);
  return true;
}

function notify(options: chrome.notifications.NotificationOptions<true>): Promise<string> {
  // Forzar que las notificaciones suenen en Mac
  const notificationOptions = {
    ...options,
    silent: false, // Forzar sonido
    requireInteraction: true, // Mantener visible hasta que el usuario interactúe
    priority: 2 // Alta prioridad para asegurar que suene
  };
  
  // Reproducir sonido adicional para Mac
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.7;
    audio.play().catch(e => console.log('🔊 Audio no disponible:', e));
  } catch (e) {
    console.log('🔊 Audio no disponible:', e);
  }
  
  return new Promise((resolve) => chrome.notifications.create(notificationOptions, id => resolve(id)))
}

// ====== WEB PUSH ======
async function ensurePushSubscription() {
  if (!VAPID_PUBLIC_KEY) {
    console.log("⚠️ VAPID_PUBLIC_KEY no configurada, Web Push deshabilitado");
    return null;
  }
  
  try {
    console.log("🔐 Configurando suscripción Web Push...");
    const sub = await self.registration.pushManager.getSubscription()
      ?? await self.registration.pushManager.subscribe({
        userVisibleOnly: true, // cambiar a false para "silent push" (Chrome 121+)
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
      })

    console.log("✅ Suscripción Web Push creada:", sub.endpoint);

    if (BACKEND_SUBSCRIBE_URL) {
      console.log("📤 Enviando suscripción al backend...");
      await fetch(BACKEND_SUBSCRIBE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub)
      });
      console.log("✅ Suscripción enviada al backend");
    }
    return sub
  } catch (err) {
    console.error("❌ Error en suscripción Web Push:", err)
    return null
  }
}

// Recibir push y mostrar notificación
self.addEventListener("push", (event: PushEvent) => {
  console.log("📨 Push recibido:", event);
  event.waitUntil((async () => {
    let payload: any = {}
    try { 
      payload = event.data ? await event.data.json() : {} 
    } catch (e) {
      console.error("❌ Error parseando payload:", e);
    }
    
    const title = payload.title ?? "Standing Desk Reminder"
    const message = payload.body ?? "Es hora de cambiar de postura"
    
    console.log("🔔 Mostrando notificación push:", { title, message });
    await notify({
      type: "basic",
      iconUrl: "icon-128.png",
      title,
      message,
      requireInteraction: true
    })
  })())
})

// ====== ALARMAS STANDING DESK ======
function setupAlarms() {
  console.log('🔧 Configurando alarmas de Standing Desk...');
  
  chrome.storage.sync.get(['schedule'], (result) => {
    console.log('📋 Datos leídos del storage para alarmas:', result);
    const schedule: ScheduleItem[] = result.schedule || defaultSchedule;

    // Limpiar alarmas existentes
    chrome.alarms.clearAll(() => {
      console.log('🧹 Alarmas anteriores limpiadas');
      
      // Crear nuevas alarmas
      let alarmsCreated = 0;
      schedule.forEach((item: ScheduleItem, index: number) => {
        console.log(`📋 Procesando item ${index}:`, item);
        
        if (item.enabled) {
          const [hours, minutes] = item.time.split(':').map(Number);
          const now = new Date();
          const alarmTime = new Date();
          alarmTime.setHours(hours, minutes, 0, 0);

          // Si la hora ya pasó hoy, programar para mañana
          if (alarmTime <= now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
          }

          chrome.alarms.create(`standing_desk_${index}`, {
            when: alarmTime.getTime(),
            periodInMinutes: 24 * 60 // Repetir cada 24 horas
          });

          alarmsCreated++;
          console.log(`⏰ Alarma ${index} programada para ${item.time} (${item.action})`);
          console.log(`📅 Próxima ejecución: ${alarmTime.toLocaleString()}`);
        } else {
          console.log(`❌ Alarma ${index} deshabilitada`);
        }
      });
      
      console.log(`✅ Total de alarmas creadas: ${alarmsCreated}`);
      
      // Verificar alarmas creadas
      chrome.alarms.getAll((alarms) => {
        console.log('📋 Alarmas activas después de setup:', alarms);
      });
    });
  });
}

// Manejar alarmas de standing desk
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('🔔 Alarma activada:', alarm.name);
  
  // Manejar alarma de prueba
  if (alarm.name === 'test_alarm') {
    console.log('🧪 Ejecutando alarma de prueba de días/horarios)');
    
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      const testMessage = '🧪 ¡Alarma de prueba activada!';
      
      console.log('🔧 Configuración para alarma de prueba:', settings.notificationType);
      
      // Las pruebas SIEMPRE funcionan, ignorando días y horarios
      
      if (settings.notificationType === 'system' || settings.notificationType === 'both') {
        notify({
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: 'Standing Desk Reminder - PRUEBA',
          message: testMessage,
          requireInteraction: true
        });
      }
      
      if (settings.notificationType === 'alert' || settings.notificationType === 'both') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab && activeTab.id && activeTab.url && 
              !activeTab.url.startsWith('chrome://') && 
              !activeTab.url.startsWith('chrome-extension://')) {
            
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: (text) => { alert(text); },
              args: [testMessage]
            });
          }
        });
      }
    });
    return;
  }
  
  // Manejar alarmas regulares de standing desk
  if (alarm.name.startsWith('standing_desk_')) {
    const index = parseInt(alarm.name.split('_')[2]);
    
    chrome.storage.sync.get(['schedule', 'settings'], (result) => {
      const schedule: ScheduleItem[] = result.schedule || defaultSchedule;
      const settings = result.settings || defaultSettings;
      const reminder = schedule[index];

      if (reminder && reminder.enabled) {
        const message = reminder.action === 'standing'
          ? '¡Es hora de trabajar de pie! 🚶‍♂️'
          : '¡Es hora de sentarse! 🪑';

        console.log('📢 Procesando recordatorio:', message);
        console.log('🔧 Tipo de notificación configurado:', settings.notificationType);

        // Verificar si debe mostrar la notificación según días y horarios
        if (!shouldShowNotification(settings)) {
          console.log('⏸️ Notificación pausada: fuera de días/horarios laborables');
          return;
        }

        // Mostrar notificación del sistema si está habilitada
        if (settings.notificationType === 'system' || settings.notificationType === 'both') {
          notify({
            type: 'basic',
            iconUrl: 'icon-128.png',
            title: 'Standing Desk Reminder',
            message: message,
            requireInteraction: true
          });
        }

        // Mostrar alert en la pestaña activa si está habilitado
        if (settings.notificationType === 'alert' || settings.notificationType === 'both') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.id && activeTab.url && 
                !activeTab.url.startsWith('chrome://') && 
                !activeTab.url.startsWith('chrome-extension://')) {
              
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (text) => { alert(text); },
                args: [message]
              });
            }
          });
        }
      }
    });
  }
});

// ====== INICIALIZACIÓN ======
chrome.runtime.onInstalled.addListener(async () => {
  console.log("🚀 Extension instalada ✅")
  console.log("🎧 Service Worker listo para recibir mensajes")
  
  // Inicializar configuración por defecto
  chrome.storage.sync.get(['schedule', 'settings'], (result) => {
    let needsUpdate = false;
    const updates: any = {};
    
    if (!result.schedule) {
      updates.schedule = defaultSchedule;
      needsUpdate = true;
      console.log('📝 Inicializando horarios por defecto');
    }
    
    // Verificar si la configuración está completa o necesita actualización
    const currentSettings = result.settings;
    if (!currentSettings || 
        !currentSettings.workDays || 
        !currentSettings.workHours ||
        typeof currentSettings.workDays.monday === 'undefined') {
      updates.settings = defaultSettings;
      needsUpdate = true;
      console.log('📝 Actualizando configuración de notificaciones (estructura incompleta)');
    }
    
    if (needsUpdate) {
      chrome.storage.sync.set(updates, () => {
        console.log('✅ Configuración por defecto guardada:', updates);
      });
    }
  });
  
  // Configurar Web Push
  await ensurePushSubscription();
  
  // Configurar alarmas
  setupAlarms();
});

// Asegurar configuración de alarmas al iniciar el navegador
chrome.runtime.onStartup.addListener(() => {
  console.log('🔁 onStartup: Reconfigurando alarmas al iniciar Chrome');
  setupAlarms();
});

// ====== MANEJO DE MENSAJES ======
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'GET_SCHEDULE') {
    chrome.storage.sync.get(['schedule'], (result) => {
      sendResponse({ schedule: result.schedule || defaultSchedule });
    });
    return true; // Mantener el puerto abierto para respuesta asíncrona
  }
  
  if (request.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse({ settings: result.settings || defaultSettings });
    });
    return true; // Mantener el puerto abierto para respuesta asíncrona
  }
  
  if (request.type === 'UPDATE_ALARMS') {
    sendResponse({ success: true });
    setupAlarms();
    return;
  }
  
  if (request.type === 'CREATE_TEST_ALARM') {
    sendResponse({ success: true });
    chrome.alarms.create('test_alarm', { when: Date.now() + 5000 });
    return;
  }
  
  if (request.type === 'TEST_NOTIFICATION') {
    sendResponse({ success: true });
    
    console.log('🧪 Ejecutando notificación de prueba de días/horarios)');
    
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || defaultSettings;
      
      // Las pruebas SIEMPRE funcionan, ignorando días y horarios
      console.log('🔧 Tipo de notificación configurado:', settings.notificationType);
      
      if (settings.notificationType === 'system' || settings.notificationType === 'both') {
        notify({
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: 'Standing Desk Reminder - PRUEBA',
          message: '🧪 ¡Esta es una notificación de prueba!',
          requireInteraction: true
        });
      }
      
      if (settings.notificationType === 'alert' || settings.notificationType === 'both') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab && activeTab.id && activeTab.url && 
              !activeTab.url.startsWith('chrome://') && 
              !activeTab.url.startsWith('chrome-extension://')) {
            
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: (text) => { alert(text); },
              args: ['🧪 ¡Esta es una alerta de prueba!']
            });
          }
        });
      }
    });
    return;
  }
  
  if (request.type === 'PING') {
    sendResponse({ success: true, message: 'Service worker listo' });
    return;
  }
  
  // Mensaje no reconocido
  sendResponse({ success: false, error: 'Mensaje no reconocido' });
});
