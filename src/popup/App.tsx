import React, { useState, useEffect } from 'react'
import Settings from './Settings'

interface ScheduleItem {
  time: string;
  action: 'standing' | 'sitting';
  enabled: boolean;
}

interface ExtensionSettings {
  notificationType: 'system' | 'alert' | 'both';
}

function App() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { time: "09:00", action: "sitting", enabled: true },
    { time: "11:00", action: "standing", enabled: true },
    { time: "14:00", action: "sitting", enabled: true }
  ]);
  const [showExtraSlots, setShowExtraSlots] = useState(false);
  const [settings, setSettings] = useState<ExtensionSettings>({
    notificationType: 'both'
  });

  const [testResult, setTestResult] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);
  const [newlyAddedSlots, setNewlyAddedSlots] = useState<number[]>([]);
  const [removingSlots, setRemovingSlots] = useState<number[]>([]);

  // Cargar configuración al iniciar
  useEffect(() => {
    console.log('🔄 Popup cargado');
    
    let loadedCount = 0;
    const totalToLoad = 2;
    
    const checkIfLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
        setIsLoading(false);
      }
    };
    
    // Cargar datos directamente sin verificar service worker
    chrome.runtime.sendMessage({ type: 'GET_SCHEDULE' }, (response) => {
      if (response?.schedule) {
        setSchedule(response.schedule);
        setShowExtraSlots(response.schedule.length > 3);
      }
      checkIfLoaded();
    });
    
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response?.settings) {
        setSettings(response.settings);
      }
      checkIfLoaded();
    });

    // Forzar actualización de alarmas al abrir el popup (defensivo)
    chrome.storage.sync.get(['schedule'], (result) => {
      const current = result.schedule || schedule;
      chrome.runtime.sendMessage({ type: 'UPDATE_ALARMS', schedule: current });
    });
  }, []);

  // Escuchar cambios en el storage para actualizar en tiempo real
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      console.log('📦 Cambios detectados en storage:', changes);
      
      if (changes.schedule) {
        console.log('🔄 Schedule actualizado desde storage:', changes.schedule.newValue);
        const newSchedule = changes.schedule.newValue || [
          { time: "09:00", action: "sitting", enabled: true },
          { time: "11:00", action: "standing", enabled: true },
          { time: "14:00", action: "sitting", enabled: true }
        ];
        setSchedule(newSchedule);
        // Actualizar showExtraSlots basado en la longitud del schedule
        setShowExtraSlots(newSchedule.length > 3);
      }
      
      if (changes.settings) {
        console.log('⚙️ Settings actualizado desde storage:', changes.settings.newValue);
        setSettings(changes.settings.newValue || { notificationType: 'both' });
      }
    };

    // Suscribirse a cambios del storage
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Limpiar listener cuando el componente se desmonte
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Actualizar hora actual cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Guardado automático cuando cambia schedule
  useEffect(() => {
    // Evitar guardado en la carga inicial
    if (!isLoading) {
      console.log('💾 Guardado automático:', { schedule });
      
      chrome.storage.sync.set({ 
        schedule: schedule
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error en guardado automático:', chrome.runtime.lastError);
        } else {
          console.log('✅ Guardado automático exitoso');
          
          // Notificar al service worker para que actualice las alarmas
          chrome.runtime.sendMessage({ 
            type: 'UPDATE_ALARMS', 
            schedule: schedule 
          });
        }
      });
    }
  }, [schedule, isLoading]); // Se ejecuta cuando cambia schedule o isLoading

  // Actualizar horario
  const updateSchedule = (index: number, field: keyof ScheduleItem, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  // Agregar slots extra
  const addExtraSlots = () => {
    const newSchedule = [...schedule];
    const newSlot1Index = newSchedule.length;
    const newSlot2Index = newSchedule.length + 1;
    
    newSchedule.push(
      { time: "16:00", action: "standing", enabled: false },
      { time: "18:00", action: "sitting", enabled: false }
    );
    
    setSchedule(newSchedule);
    setShowExtraSlots(true);
    setNewlyAddedSlots([newSlot1Index, newSlot2Index]);
    
    // Limpiar la animación después de que termine
    setTimeout(() => {
      setNewlyAddedSlots([]);
    }, 300);
  };

  // Remover slots extra
  const removeExtraSlots = () => {
    // Marcar los slots que se van a quitar para la animación
    setRemovingSlots([3, 4]);
    
    // Esperar a que termine la animación de salida antes de quitar los elementos
    setTimeout(() => {
      const newSchedule = schedule.slice(0, 3);
      setSchedule(newSchedule);
      setShowExtraSlots(false);
      setRemovingSlots([]);
    }, 300);
  };

  // Probar notificación
  const testNotification = () => {
    setTestResult('⏳ Enviando notificación de prueba...');
    
    chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, (response) => {
      if (chrome.runtime.lastError) {
        setTestResult('❌ Error: ' + chrome.runtime.lastError.message);
      } else {
        setTestResult('✅ Notificación de prueba enviada');
        setTimeout(() => setTestResult(''), 3000);
      }
    });
  };

  // Probar alarma
  const testAlarm = () => {
    setTestResult('⏳ Creando alarma de prueba...');
    
    chrome.runtime.sendMessage({ type: 'CREATE_TEST_ALARM' }, (response) => {
      if (chrome.runtime.lastError) {
        setTestResult('❌ Error: ' + chrome.runtime.lastError.message);
      } else {
        setTestResult('✅ Alarma de prueba creada (5 segundos)');
        setTimeout(() => setTestResult(''), 3000);
      }
    });
  };

  // Mostrar pantalla de carga si está cargando
  if (isLoading) {
    return (
      <div style={{ 
        minWidth: 350, 
        padding: '15px 25px', 
        fontFamily: 'Arial, sans-serif',
        borderRadius: '50px',
        background: 'linear-gradient(135deg, #f8faff 0%, #e8f4fd 30%, #ffffff 70%, #f0f8ff 100%)',
        boxShadow: '0 20px 60px rgba(66, 133, 244, 0.15), 0 8px 25px rgba(0,0,0,0.1)',
        border: '2px solid rgba(66, 133, 244, 0.1)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: 10 }}>⏳</div>
          <div>Cargando...</div>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de configuración si está activada
  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} currentSchedule={schedule} />;
  }

  return (
    <div style={{ 
      minWidth: 350, 
      padding: '15px 25px', 
      fontFamily: 'Arial, sans-serif',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, #f8faff 0%, #e8f4fd 30%, #ffffff 70%, #f0f8ff 100%)',
      boxShadow: '0 20px 60px rgba(66, 133, 244, 0.15), 0 8px 25px rgba(0,0,0,0.1)',
      border: '2px solid rgba(66, 133, 244, 0.1)',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      position: 'relative',
      transform: 'translateY(0)',
      transition: 'all 0.3s ease'
    }}>
      {/* Curva decorativa superior derecha */}
      <div style={{
        position: 'absolute',
        top: '-60px',
        right: '-60px',
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, rgba(255, 237, 78, 0.1) 50%, transparent 70%)',
        zIndex: 0
      }} />
      
      {/* Curva decorativa inferior izquierda */}
      <div style={{
        position: 'absolute',
        bottom: '-40px',
        left: '-40px',
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(107, 107, 255, 0.15) 0%, rgba(142, 142, 255, 0.08) 50%, transparent 70%)',
        zIndex: 0
      }} />
      
      {/* Curva decorativa central superior */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        left: '30%',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52, 168, 83, 0.12) 0%, rgba(45, 143, 71, 0.06) 50%, transparent 70%)',
        zIndex: 0
      }} />
      
      {/* Curva decorativa inferior derecha */}
      <div style={{
        position: 'absolute',
        bottom: '-25px',
        right: '20%',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 107, 107, 0.1) 0%, rgba(255, 142, 142, 0.05) 50%, transparent 70%)',
        zIndex: 0
      }} />
      
      {/* Curva decorativa superior izquierda */}
      <div style={{
        position: 'absolute',
        top: '-15px',
        left: '-15px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(138, 43, 226, 0.08) 0%, rgba(147, 112, 219, 0.04) 50%, transparent 70%)',
        zIndex: 0
      }} />
      
      {/* Contenido principal */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '10px',
          minHeight: '80px',
          position: 'relative'
        }}>
          {/* Botón de configuración arriba a la izquierda */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(true)}
              onMouseEnter={(e) => {
                setShowSettingsTooltip(true);
                e.currentTarget.style.color = '#495057';
                e.currentTarget.style.transform = 'rotate(90deg)';
              }}
              onMouseLeave={(e) => {
                setShowSettingsTooltip(false);
                e.currentTarget.style.color = '#6c757d';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#6c757d',
                transition: 'all 0.3s ease'
              }}
            >
              ⚙️
            </button>
            
            {/* Tooltip */}
            {showSettingsTooltip && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '40px',
                transform: 'translateY(-50%)',
                backgroundColor: '#333',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                pointerEvents: 'none'
              }}>
                Settings
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '-4px',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: '4px solid #333'
                }} />
              </div>
            )}
          </div>
          
          {/* Logo principal centrado usando el icono original de la extensión */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '55px',
              height: '55px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(66, 133, 244, 0.3)',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              padding: '6px'
            }}>
              {/* Icono original de la extensión */}
              <img 
                src="../icon-128.png" 
                alt="Extension Icon"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                  position: 'relative',
                  zIndex: 2
                }}
              />
              
              {/* Efecto de brillo */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                animation: 'shine 3s infinite',
                zIndex: 1
              }} />
            </div>
          </div>
          
          {/* Reloj en la esquina superior derecha con diseño mejorado */}
          <div style={{
            padding: '4px 6px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '10px',
            fontSize: '10px',
            border: '2px solid rgba(66, 133, 244, 0.1)',
            fontWeight: '600',
            color: '#4285f4',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(10px)',
            marginRight: '-10px'
          }}>
            <span style={{ fontSize: '12px' }}>🕐</span>
            <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px', fontSize: '10px' }}>
              {now.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <h1 style={{ 
          background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 20px 0',
          fontSize: '26px',
          textAlign: 'center',
          fontWeight: '800',
          letterSpacing: '0.5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          Standing Desk Reminder
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '3px',
            background: 'linear-gradient(90deg, #4285f4, #34a853)',
            borderRadius: '2px'
          }} />
        </h1>

        {/* Configuración de horarios */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ 
            fontSize: '18px', 
            marginBottom: 15, 
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            ⏰ Configuración de Horarios:
          </h2>
          
          {schedule.map((item, index) => (
            <div key={`${index}-${item.time}-${item.action}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              padding: 6,
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              border: '1px solid #e9ecef',
              // Animación según el estado del slot
              opacity: 1,
              transform: 'translateY(0)',
              transition: 'all 0.3s ease',
              animation: newlyAddedSlots.includes(index) ? 'slideIn 0.3s ease-out' : 
                        removingSlots.includes(index) ? 'slideOut 0.3s ease-out' : 'none'
            }}>
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => updateSchedule(index, 'enabled', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              
              {/* Input de tiempo */}
              <input
                type="time"
                value={item.time}
                onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                style={{
                  width: '110px',
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: '12px',
                  marginRight: 6
                }}
              />
              
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => updateSchedule(index, 'action', 'sitting')}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: item.action === 'sitting' ? '#4285f4' : '#e9ecef',
                    color: item.action === 'sitting' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🪑 Sentado
                </button>
                <button
                  onClick={() => updateSchedule(index, 'action', 'standing')}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: item.action === 'standing' ? '#4285f4' : '#e9ecef',
                    color: item.action === 'standing' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🚶‍♂️ De Pie
                </button>
              </div>
            </div>
          ))}
          
          {/* Botón para agregar/quitar horarios */}
          <div style={{ textAlign: 'center', marginTop: 15 }}>
            {!showExtraSlots ? (
              <button
                onClick={addExtraSlots}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#34a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2d8f47';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#34a853';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
              >
                ➕ Agregar horario
              </button>
            ) : (
              <button
                onClick={removeExtraSlots}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease',
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c82333';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
              >
                ➖ Quitar horarios extra
              </button>
            )}
          </div>
        </div>

        {/* Resultado de la prueba */}
        {testResult && (
          <div style={{
            padding: 12,
            backgroundColor: testResult.includes('✅') ? '#d4edda' : '#f8d7da',
            color: testResult.includes('✅') ? '#155724' : '#721c24',
            borderRadius: 8,
            marginBottom: 15,
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {testResult}
          </div>
        )}

        {/* Información rápida */}
        <div style={{
          padding: 12,
          backgroundColor: '#e8f4fd',
          borderRadius: 8,
          border: '1px solid #4285f4',
          fontSize: '12px',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>
            <strong>💡 Patrón recomendado:</strong> Sentado → De pie → Sentado. Usa "Configuración" para personalizar tipos de notificación y probar.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
