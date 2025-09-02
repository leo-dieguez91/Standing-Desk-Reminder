import React, { useState, useEffect } from 'react'

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

interface SettingsProps {
  onBack: () => void;
  currentSchedule: ScheduleItem[];
}

function Settings({ onBack, currentSchedule }: SettingsProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(currentSchedule);
  const [settings, setSettings] = useState<ExtensionSettings>({
    notificationType: 'both',
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
  });

  const [showExtraSlots, setShowExtraSlots] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    notifications: false,
    workDays: false,
    workHours: false,
    tests: false
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [showResetTooltip, setShowResetTooltip] = useState(false);
  const [showBackTooltip, setShowBackTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFeedback, setGenerationFeedback] = useState('');


  // Cargar configuración al iniciar
  useEffect(() => {
    console.log('⚙️ Pantalla de configuración cargada');
    
    // Usar el schedule actual que viene como prop
    setSchedule(currentSchedule);
    setShowExtraSlots(currentSchedule.length > 3);
    
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response?.settings) {
        setSettings(response.settings);
      }
      // Marcar como cargado después de obtener settings
      setIsLoading(false);
    });
  }, [currentSchedule]);

  // Guardado automático cuando cambian settings o schedule
  useEffect(() => {
    // Evitar guardado en la carga inicial
    if (!isLoading) {
      console.log('💾 Guardado automático de configuración:', { schedule, settings });
      
      chrome.storage.sync.set({ 
        schedule: schedule, 
        settings: settings 
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
  }, [settings, schedule, isLoading]); // Se ejecuta cuando cambian settings, schedule o isLoading

  // Actualizar horario
  const updateSchedule = (index: number, field: keyof ScheduleItem, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  // Agregar slots extra
  const addExtraSlots = () => {
    const newSchedule = [...schedule];
    newSchedule.push(
      { time: "16:00", action: "standing", enabled: true },
      { time: "18:00", action: "sitting", enabled: true }
    );
    setSchedule(newSchedule);
    setShowExtraSlots(true);
  };

  // Remover slots extra
  const removeExtraSlots = () => {
    const newSchedule = schedule.slice(0, 3);
    setSchedule(newSchedule);
    setShowExtraSlots(false);
  };

  // Alternar sección expandida/contraída (acordeón exclusivo)
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[section];
      
      // Si la sección actual está expandida, la cerramos
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [section]: false
        };
      }
      
      // Si la sección actual está cerrada, cerramos todas las demás y abrimos esta
      return {
        notifications: false,
        workDays: false,
        workHours: false,
        tests: false,
        [section]: true
      };
    });
  };



  // Restaurar configuración por defecto (como instalación desde cero)
  const resetToDefault = () => {
    const defaultSchedule = [
      { time: "09:00", action: "sitting" as const, enabled: true },
      { time: "11:00", action: "standing" as const, enabled: true },
      { time: "14:00", action: "sitting" as const, enabled: true }
    ];
    const defaultSettings: ExtensionSettings = {
      notificationType: 'both',
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
    
    // Limpiar storage y guardar configuración por defecto
    chrome.storage.sync.clear(() => {
      chrome.storage.sync.set({ 
        schedule: defaultSchedule, 
        settings: defaultSettings 
      }, () => {
        console.log('✅ Configuración restaurada a valores por defecto');
        // Actualizar el estado local
        setSchedule(defaultSchedule);
        setSettings(defaultSettings);
        setShowExtraSlots(false);
        
        // Notificar al service worker para que actualice las alarmas
        chrome.runtime.sendMessage({ 
          type: 'UPDATE_ALARMS', 
          schedule: defaultSchedule 
        });
      });
    });
  };

  return (
    <div style={{ 
      minWidth: 400, 
      padding: 25, 
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
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ position: 'relative' }}>
        <button
          onClick={onBack}
            onMouseEnter={(e) => {
              setShowBackTooltip(true);
              e.currentTarget.style.color = '#495057';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              setShowBackTooltip(false);
              e.currentTarget.style.color = '#6c757d';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#6c757d',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
              transition: 'all 0.3s ease'
          }}
        >
          ←
        </button>
          
          {/* Tooltip para botón atrás */}
          {showBackTooltip && (
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
              Atrás
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
        
        <h1 style={{ 
          background: 'linear-gradient(135deg, #34a853 0%, #4285f4 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          fontSize: '18px',
          fontWeight: '800',
          letterSpacing: '0.5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          Configuración Avanzada
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '3px',
            background: 'linear-gradient(90deg, #34a853, #4285f4)',
            borderRadius: '2px'
          }} />
        </h1>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={resetToDefault}
            onMouseEnter={(e) => {
              setShowResetTooltip(true);
              e.currentTarget.style.color = '#dc3545';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              setShowResetTooltip(false);
              e.currentTarget.style.color = '#6c757d';
              e.currentTarget.style.transform = 'scale(1)';
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
              fontSize: '22px',
              color: '#6c757d',
              transition: 'all 0.3s ease'
            }}
          >
            🔄
          </button>
          
          {/* Tooltip */}
          {showResetTooltip && (
            <div style={{
              position: 'absolute',
              top: '50%',
              right: '40px',
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
              Restaurar Defaults
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '-4px',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: '4px solid #333'
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Configuración de notificaciones */}
      <div style={{ marginBottom: 20 }}>
        <h3 
          onClick={() => toggleSection('notifications')}
          style={{ 
            fontSize: '16px', 
            marginBottom: 10, 
            color: '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔔 Configuración de Notificaciones:</span>
            {!expandedSections.notifications && (
              <span style={{ 
                fontSize: '12px', 
                color: '#4285f4', 
                backgroundColor: '#e8f4fd',
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid #4285f4'
              }}>
                {settings.notificationType === 'system' && '🔔 Sistema'}
                {settings.notificationType === 'alert' && '⚠️ Alertas'}
                {settings.notificationType === 'both' && '🔔⚠️ Ambos'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {expandedSections.notifications ? '▼' : '▶'}
          </span>
        </h3>
        <div style={{
          maxHeight: expandedSections.notifications ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: expandedSections.notifications ? 1 : 0,
          transform: expandedSections.notifications ? 'translateY(0)' : 'translateY(-10px)'
        }}>
          <div style={{
            padding: 20,
            backgroundColor: 'white',
            borderRadius: 8,
            border: '1px solid #e9ecef',
            transform: expandedSections.notifications ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              display: 'flex',
              backgroundColor: '#e9ecef',
              borderRadius: 25,
              padding: 3,
              border: '1px solid #ddd',
              width: 'fit-content',
              margin: '0 auto'
            }}>
              <button
                onClick={() => setSettings({ ...settings, notificationType: 'system' })}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 22,
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: settings.notificationType === 'system' ? '#4285f4' : 'transparent',
                  color: settings.notificationType === 'system' ? 'white' : '#666',
                  transition: 'all 0.2s ease',
                  fontWeight: settings.notificationType === 'system' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔔 Sistema
              </button>
              
              <button
                onClick={() => setSettings({ ...settings, notificationType: 'alert' })}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 22,
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: settings.notificationType === 'alert' ? '#4285f4' : 'transparent',
                  color: settings.notificationType === 'alert' ? 'white' : '#666',
                  transition: 'all 0.2s ease',
                  fontWeight: settings.notificationType === 'alert' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⚠️ Alertas
              </button>
              
              <button
                onClick={() => setSettings({ ...settings, notificationType: 'both' })}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 22,
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: settings.notificationType === 'both' ? '#4285f4' : 'transparent',
                  color: settings.notificationType === 'both' ? 'white' : '#666',
                  transition: 'all 0.2s ease',
                  fontWeight: settings.notificationType === 'both' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔔⚠️ Ambos
              </button>
            </div>
            
            <div style={{ marginTop: 20, fontSize: '12px', color: '#666' }}>
              <p><strong>🔔 Sistema:</strong> Notificaciones nativas del sistema operativo</p>
              <p><strong>⚠️ Alertas:</strong> Ventanas emergentes en la página web activa</p>
              <p><strong>🔔⚠️ Ambos:</strong> Combinación de ambos métodos (recomendado)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de días laborables */}
      <div style={{ marginBottom: 20 }}>
        <h3 
          onClick={() => toggleSection('workDays')}
          style={{ 
            fontSize: '16px', 
            marginBottom: 10, 
            color: '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📅 Días Activos:</span>
            {!expandedSections.workDays && (
              <div style={{ 
                display: 'flex',
                gap: '2px',
                alignItems: 'center'
              }}>
                {(() => {
                  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const dayInitials = {
                    monday: 'L',
                    tuesday: 'Ma',
                    wednesday: 'Mi',
                    thursday: 'J',
                    friday: 'V',
                    saturday: 'S',
                    sunday: 'D'
                  };
                  
                  const selectedDays = daysOrder
                    .filter(day => settings.workDays[day as keyof typeof settings.workDays])
                    .map(day => dayInitials[day as keyof typeof dayInitials]);
                  
                  const dayNames = {
                    'L': 'Lunes',
                    'Ma': 'Martes',
                    'Mi': 'Miércoles',
                    'J': 'Jueves',
                    'V': 'Viernes',
                    'S': 'Sábado',
                    'D': 'Domingo'
                  };
                  
                  return selectedDays.length > 0 ? selectedDays.map((day, index) => (
                    <div 
                      key={index} 
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#34a853',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #34a853'
                      }}
                    >
                      {day}
                    </div>
                  )) : <span style={{ color: '#666' }}>Ninguno</span>;
                })()}
              </div>
            )}
          </div>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {expandedSections.workDays ? '▼' : '▶'}
          </span>
        </h3>
        <div style={{
          maxHeight: expandedSections.workDays ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: expandedSections.workDays ? 1 : 0,
          transform: expandedSections.workDays ? 'translateY(0)' : 'translateY(-10px)'
        }}>
          <div style={{
            padding: 15,
            backgroundColor: 'white',
            borderRadius: 8,
            border: '1px solid #e9ecef',
            transform: expandedSections.workDays ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[
                { key: 'monday', label: 'L', tooltip: 'Lunes' },
                { key: 'tuesday', label: 'Ma', tooltip: 'Martes' },
                { key: 'wednesday', label: 'Mi', tooltip: 'Miércoles' },
                { key: 'thursday', label: 'J', tooltip: 'Jueves' },
                { key: 'friday', label: 'V', tooltip: 'Viernes' },
                { key: 'saturday', label: 'S', tooltip: 'Sábado' },
                { key: 'sunday', label: 'D', tooltip: 'Domingo' }
              ].map(({ key, label, tooltip }) => (
                <button
                  key={key}
                  onClick={() => setSettings({
                    ...settings,
                    workDays: {
                      ...settings.workDays,
                      [key]: !settings.workDays[key as keyof typeof settings.workDays]
                    }
                  })}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      text: tooltip,
                      x: rect.left + rect.width / 2,
                      y: rect.top
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    backgroundColor: settings.workDays[key as keyof typeof settings.workDays] 
                      ? '#4285f4' 
                      : '#e9ecef',
                    color: settings.workDays[key as keyof typeof settings.workDays] 
                      ? 'white' 
                      : '#666',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <div style={{ marginTop: 15, fontSize: '12px', color: '#666', textAlign: 'center' }}>
              <p><strong>📅 Selecciona los días:</strong> Haz clic en los días cuando quieres recibir recordatorios.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de horario de trabajo */}
      <div style={{ marginBottom: 20 }}>
        <h3 
          onClick={() => toggleSection('workHours')}
          style={{ 
            fontSize: '16px', 
            marginBottom: 10, 
            color: '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎲 Generador Automático:</span>

          </div>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {expandedSections.workHours ? '▼' : '▶'}
          </span>
        </h3>
        <div style={{
          maxHeight: expandedSections.workHours ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: expandedSections.workHours ? 1 : 0,
          transform: expandedSections.workHours ? 'translateY(0)' : 'translateY(-10px)'
        }}>
          <div style={{
            padding: 15,
            backgroundColor: 'white',
            borderRadius: 8,
            border: '1px solid #e9ecef',
            transform: expandedSections.workHours ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
              {/* Selector de horario de trabajo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="time"
                  value={settings.workHours.start}
                  onChange={(e) => setSettings({
                    ...settings,
                    workHours: {
                      ...settings.workHours,
                      start: e.target.value
                    }
                  })}
                  style={{
                      padding: '6px 8px',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: '2px solid rgba(66, 133, 244, 0.1)',
                      fontWeight: '600',
                    color: '#333',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      width: '100px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px'
                    }}
                  />

                </div>
                <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>a</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="time"
                  value={settings.workHours.end}
                  onChange={(e) => setSettings({
                    ...settings,
                    workHours: {
                      ...settings.workHours,
                      end: e.target.value
                    }
                  })}
                  style={{
                      padding: '6px 8px',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: '2px solid rgba(66, 133, 244, 0.1)',
                      fontWeight: '600',
                    color: '#333',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      width: '100px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px'
                    }}
                  />

                </div>
              </div>
              
              {/* Selector de cantidad de horarios */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Recordatorios:</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                  onClick={() => setSettings({
                    ...settings,
                    workHours: {
                      ...settings.workHours,
                        enabled: false // Usamos enabled para guardar la cantidad (false = 3, true = 5)
                    }
                  })}
                  style={{
                      padding: '6px 12px',
                      backgroundColor: !settings.workHours.enabled ? '#4285f4' : '#e9ecef',
                      color: !settings.workHours.enabled ? 'white' : '#666',
                      border: 'none',
                      borderRadius: 6,
                    cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    3 Horarios
                  </button>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      workHours: {
                        ...settings.workHours,
                        enabled: true
                      }
                    })}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: settings.workHours.enabled ? '#4285f4' : '#e9ecef',
                      color: settings.workHours.enabled ? 'white' : '#666',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    5 Horarios
                  </button>
                </div>
              </div>
              
              {/* Botón para generar horarios */}
              <button
                onClick={() => {
                  setIsGenerating(true);
                  setGenerationFeedback('');
                  
                  // Función para generar horarios aleatorios
                  const generateRandomSchedule = (): ScheduleItem[] => {
                    // Usar el horario de trabajo configurado
                    const [startHour, startMinute] = settings.workHours.start.split(':').map(Number);
                    const [endHour, endMinute] = settings.workHours.end.split(':').map(Number);
                    
                    // Calcular tiempo total disponible en minutos
                    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                    
                    // Determinar cantidad de horarios (3 o 5)
                    const scheduleCount = settings.workHours.enabled ? 5 : 3;
                    
                    // Crear patrón según la cantidad
                    let pattern: ('sitting' | 'standing')[] = [];
                    if (scheduleCount === 3) {
                      pattern = ['sitting', 'standing', 'sitting'];
                    } else {
                      pattern = ['sitting', 'standing', 'sitting', 'standing', 'sitting'];
                    }
                    
                    // El primer horario siempre empieza a la hora exacta configurada
                    let currentHour = startHour;
                    let currentMinute = startMinute;
                    
                    console.log('🎲 Generando horarios aleatorios:', {
                      startTime: `${startHour}:${startMinute}`,
                      endTime: `${endHour}:${endMinute}`,
                      firstTime: `${currentHour}:${currentMinute}`
                    });
                    
                    const newSchedule: ScheduleItem[] = [];
                    
                    pattern.forEach((action, index) => {
                      // A partir del segundo horario, agregar aleatoriedad ANTES de crear el horario
                      if (index > 0) {
                        // Generar offset aleatorio entre 30 y 120 minutos
                        const randomOffset = Math.floor(Math.random() * 90) + 30;
                        currentMinute += randomOffset;
                        
                        // Ajustar horas si es necesario
                        while (currentMinute >= 60) {
                          currentHour += Math.floor(currentMinute / 60);
                          currentMinute = currentMinute % 60;
                        }
                        
                        // Redondear a 0 o 5
                        currentMinute = Math.floor(currentMinute / 5) * 5;
                        if (currentMinute === 60) {
                          currentMinute = 0;
                          currentHour += 1;
                        }
                        
                        console.log(`🎲 Horario ${index + 1} aleatorio: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
                      }
                      
                      // Verificar que no se pase del horario de trabajo
                      const currentTimeInMinutes = currentHour * 60 + currentMinute;
                      const endTimeInMinutes = endHour * 60 + endMinute;
                      
                      let finalHour = currentHour;
                      let finalMinute = currentMinute;
                      
                      // Si se pasa del límite, usar la hora de fin
                      if (currentTimeInMinutes > endTimeInMinutes) {
                        finalHour = endHour;
                        finalMinute = endMinute;
                        console.log(`⚠️ Horario ${index + 1} ajustado a límite: ${currentHour}:${currentMinute.toString().padStart(2, '0')} → ${finalHour}:${finalMinute.toString().padStart(2, '0')}`);
                      }
                      
                      const time = `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
                      newSchedule.push({
                        time: time,
                        action: action,
                        enabled: true
                      });
                      

                    });
                    
                    return newSchedule;
                  };
                  
                  const newSchedule = generateRandomSchedule();
                  setSchedule(newSchedule);
                  setShowExtraSlots(true);
                  
                  // Guardar en storage
                  chrome.storage.sync.set({ schedule: newSchedule }, () => {
                    console.log('✅ Horarios generados y guardados:', newSchedule);
                    // Notificar al service worker
                    chrome.runtime.sendMessage({ 
                      type: 'UPDATE_ALARMS', 
                      schedule: newSchedule 
                    });
                    
                    // Mostrar feedback
                    const scheduleCount = settings.workHours.enabled ? 5 : 3;
                    setGenerationFeedback(`✅ ${scheduleCount} horarios generados exitosamente`);
                    setTimeout(() => {
                      setIsGenerating(false);
                      setGenerationFeedback('');
                    }, 1000);
                  });
                }}
                disabled={isGenerating}
                style={{
                  padding: '12px 24px',
                  backgroundColor: isGenerating ? '#ccc' : '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                    transition: 'all 0.2s ease',
                  boxShadow: isGenerating ? 'none' : '0 2px 8px rgba(66, 133, 244, 0.3)',
                  transform: isGenerating ? 'scale(0.98)' : 'scale(1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#3367d6';
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#4285f4';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 133, 244, 0.3)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                  }
                }}
              >
                {isGenerating ? '⏳ Generando...' : '🎲 Generar Horarios'}
              </button>
              
              {/* Feedback de generación */}
              {generationFeedback && (
                    <div style={{
                  fontSize: '12px',
                  color: '#34a853',
                  fontWeight: '500',
                  textAlign: 'center',
                  marginTop: 8,
                  padding: '6px 12px',
                  backgroundColor: 'rgba(52, 168, 83, 0.1)',
                  borderRadius: 6,
                  border: '1px solid rgba(52, 168, 83, 0.2)'
                }}>
                  {generationFeedback}
                    </div>
                  )}
              

            </div>
            
            <div style={{ marginTop: 12, fontSize: '12px', color: '#666', textAlign: 'center' }}>
              <p><strong>💡 Nota:</strong> Los horarios se generan desde tu hora de inicio hasta el final de tu jornada.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de prueba */}
      <div style={{ marginBottom: 20 }}>
        <h3 
          onClick={() => toggleSection('tests')}
          style={{ 
            fontSize: '16px', 
            marginBottom: 10, 
            color: '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧪 Probar Notificaciones:</span>
          </div>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {expandedSections.tests ? '▼' : '▶'}
          </span>
        </h3>
        <div style={{
          maxHeight: expandedSections.tests ? '500px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: expandedSections.tests ? 1 : 0,
          transform: expandedSections.tests ? 'translateY(0)' : 'translateY(-10px)'
        }}>
          <div style={{
            padding: 15,
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #e9ecef',
            transform: expandedSections.tests ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
          <button
            onClick={() => {
              chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, () => {
                console.log('✅ Notificación de prueba enviada');
              });
            }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#34a853',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '14px',
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
            🔔 Probar Notificación
          </button>
          
          <button
            onClick={() => {
              chrome.runtime.sendMessage({ type: 'CREATE_TEST_ALARM' }, () => {
                console.log('⏰ Alarma de prueba creada (5 segundos)');
              });
            }}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              transform: 'translateY(0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e68900';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff9800';
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
            ⏰ Probar Alarma (5 seg)
          </button>
          </div>
          
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p style={{ margin: 0 }}><strong>💡 Nota:</strong> Usa estos botones para verificar que las notificaciones funcionen correctamente.</p>
          </div>
          </div>
        </div>
      </div>
      </div>
      
      {/* Tooltip personalizado */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 35,
          backgroundColor: '#333',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          transform: 'translateX(-50%)'
        }}>
          {tooltip.text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #333'
          }} />
        </div>
      )}
    </div>
  )
}

export default Settings
