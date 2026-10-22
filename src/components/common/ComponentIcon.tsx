import React from 'react';

interface ComponentIconProps {
  type: string;
  className?: string;
  size?: number;
}

export const ComponentIcon: React.FC<ComponentIconProps> = ({ type, className = "w-6 h-6", size = 28 }) => {
  // Renderiza un símbolo esquemático miniatura vectorial nítido
  switch (type) {
    // ----------------------------------------------------
    // ALIMENTACIONES
    // ----------------------------------------------------
    case 'power_l':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <circle cx="14" cy="9" r="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
          <text x="14" y="12" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1d4ed8" fontFamily="monospace">L</text>
          <line x1="14" y1="15" x2="14" y2="24" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'power_n':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <circle cx="14" cy="9" r="6" fill="#eff6ff" stroke="#0284c7" strokeWidth="1.8" />
          <text x="14" y="12" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0369a1" fontFamily="monospace">N</text>
          <line x1="14" y1="15" x2="14" y2="24" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'power_pe':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="15" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="15" x2="22" y2="15" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="19" x2="19" y2="19" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="23" x2="16" y2="23" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'power_ln':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="8" y1="6" x2="8" y2="22" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="20" y1="6" x2="20" y2="22" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="8" r="2.5" fill="#b45309" />
          <circle cx="20" cy="8" r="2.5" fill="#2563eb" />
          <text x="8" y="27" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#b45309">L</text>
          <text x="20" y="27" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#2563eb">N</text>
        </svg>
      );

    case 'power_3phase':
    case 'power_3phase_pe':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="5" y1="8" x2="23" y2="8" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="8" x2="8" y2="22" stroke="#b45309" strokeWidth="1.5" />
          <line x1="14" y1="8" x2="14" y2="22" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="20" y1="8" x2="20" y2="22" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2" fill="#b45309" />
          <circle cx="14" cy="8" r="2" fill="#1e293b" />
          <circle cx="20" cy="8" r="2" fill="#64748b" />
          <text x="14" y="27" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">3~ L123</text>
        </svg>
      );

    case 'power_dc':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="6" y1="10" x2="22" y2="10" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="9" y1="17" x2="19" y2="17" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 2" />
          <text x="8" y="7" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ef4444">+</text>
          <text x="20" y="7" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">-</text>
        </svg>
      );

    // ----------------------------------------------------
    // PROTECCIONES Y DISYUNTORES
    // ----------------------------------------------------
    case 'breaker_3p':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="3" y="4" width="22" height="20" rx="3" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          {[7, 14, 21].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1="6" x2={cx} y2="10" stroke="#0f172a" strokeWidth="1.5" />
              <line x1={cx} y1="10" x2={cx - 3} y2="17" stroke="#d97706" strokeWidth="1.5" />
              <line x1={cx} y1="18" x2={cx} y2="22" stroke="#0f172a" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      );

    case 'breaker_1p_n':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="5" y="4" width="18" height="20" rx="3" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          {[10, 18].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1="6" x2={cx} y2="10" stroke="#0f172a" strokeWidth="1.5" />
              <line x1={cx} y1="10" x2={cx - 3} y2="17" stroke="#d97706" strokeWidth="1.5" />
              <line x1={cx} y1="18" x2={cx} y2="22" stroke="#0f172a" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      );

    case 'thermal_relay_power':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          {[7, 14, 21].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1="4" x2={cx} y2="9" stroke="#0f172a" strokeWidth="1.5" />
              <rect x={cx - 2.5} y="9" width="5" height="10" rx="1" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
              <line x1={cx} y1="19" x2={cx} y2="24" stroke="#0f172a" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      );

    case 'thermal_contact_nc':
    case 'thermal_contact_no':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="10" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="14" y1="18" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
          <line x1={type.includes('nc') ? '14' : '18'} y1="10" x2="14" y2="18" stroke="#d97706" strokeWidth="1.8" />
          <path d="M 10 14 L 12 14" stroke="#d97706" strokeWidth="1.5" />
        </svg>
      );

    // ----------------------------------------------------
    // CONTACTORES
    // ----------------------------------------------------
    case 'contactor_power_3p':
    case 'contactor_power_4p':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          {[7, 14, 21].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1="4" x2={cx} y2="10" stroke="#0f172a" strokeWidth="1.5" />
              <line x1={cx + 3.5} y1="10" x2={cx} y2="18" stroke="#059669" strokeWidth="1.8" />
              <line x1={cx} y1="18" x2={cx} y2="24" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={cx} cy="18" r="1.2" fill="#0f172a" />
            </g>
          ))}
        </svg>
      );

    // ----------------------------------------------------
    // CONTACTOS AUXILIARES
    // ----------------------------------------------------
    case 'contact_no':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="9" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="18" y1="9" x2="14" y2="19" stroke="#059669" strokeWidth="1.8" />
          <line x1="14" y1="19" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="1.5" fill="#0f172a" />
          <text x="14" y="27" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#059669">NO</text>
        </svg>
      );

    case 'contact_nc':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="9" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="14" y1="9" x2="14" y2="19" stroke="#dc2626" strokeWidth="1.8" />
          <line x1="14" y1="19" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="1.5" fill="#0f172a" />
          <text x="14" y="27" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#dc2626">NC</text>
        </svg>
      );

    case 'contact_timer_ton_no':
    case 'contact_timer_ton_nc':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="9" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="18" y1="9" x2="14" y2="19" stroke="#2563eb" strokeWidth="1.8" />
          <path d="M 16 13 A 3 3 0 0 1 20 13" stroke="#2563eb" strokeWidth="1.2" fill="none" />
          <line x1="14" y1="19" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    // ----------------------------------------------------
    // PULSADORES
    // ----------------------------------------------------
    case 'button_no':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="9" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="18" y1="9" x2="14" y2="19" stroke="#059669" strokeWidth="1.8" />
          <rect x="18" y="12" width="5" height="3" rx="1" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
          <line x1="14" y1="19" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="1.5" fill="#0f172a" />
        </svg>
      );

    case 'button_nc':
    case 'emergency_stop':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="4" x2="14" y2="9" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="14" y1="9" x2="14" y2="19" stroke="#dc2626" strokeWidth="1.8" />
          <rect x="15" y="12" width="5" height="3" rx="1" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
          <line x1="14" y1="19" x2="14" y2="24" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="19" r="1.5" fill="#0f172a" />
        </svg>
      );

    // ----------------------------------------------------
    // BOBINAS
    // ----------------------------------------------------
    case 'coil_contactor':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="9" y="8" width="10" height="12" rx="1.5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
          <line x1="14" y1="20" x2="14" y2="25" stroke="#0f172a" strokeWidth="1.5" />
          <text x="14" y="16.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1d4ed8">KM</text>
        </svg>
      );

    case 'coil_timer_ton':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="8" y="8" width="12" height="12" rx="1.5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
          <line x1="8" y1="8" x2="12" y2="20" stroke="#2563eb" strokeWidth="1" />
          <line x1="14" y1="20" x2="14" y2="25" stroke="#0f172a" strokeWidth="1.5" />
          <text x="15" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#1d4ed8">TON</text>
        </svg>
      );

    // ----------------------------------------------------
    // MOTORES
    // ----------------------------------------------------
    case 'motor_3phase':
    case 'motor_single_phase':
    case 'motor_star_delta':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="10" y1="3" x2="10" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="14" y1="3" x2="14" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="18" y1="3" x2="18" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="17" r="8" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.8" />
          <text x="14" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0369a1" fontFamily="sans-serif">M</text>
          <text x="14" y="22" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0284c7">3~</text>
        </svg>
      );

    // ----------------------------------------------------
    // PILOTOS DE SEÑALIZACIÓN
    // ----------------------------------------------------
    case 'pilot_light_green':
    case 'pilot_light_red':
    case 'pilot_light_yellow': {
      const fill = type.includes('green') ? '#10b981' : type.includes('red') ? '#ef4444' : '#f59e0b';
      const border = type.includes('green') ? '#047857' : type.includes('red') ? '#b91c1c' : '#d97706';
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="14" cy="15" r="7" fill={fill} stroke={border} strokeWidth="1.8" />
          <line x1="9" y1="10" x2="19" y2="20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="19" y1="10" x2="9" y2="20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="22" x2="14" y2="26" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    }

    // ----------------------------------------------------
    // GRAFCET (IEC 60848)
    // ----------------------------------------------------
    case 'grafcet_step':
    case 'grafcet_step_init':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="2" x2="14" y2="6" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="6" y="6" width="16" height="16" rx="1" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.6" />
          {type.includes('init') && (
            <rect x="8.5" y="8.5" width="11" height="11" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          )}
          <text x="14" y="16.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a" fontFamily="monospace">
            {type.includes('init') ? '0' : '1'}
          </text>
          <line x1="14" y1="22" x2="14" y2="26" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'grafcet_transition':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="2" x2="14" y2="26" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="7" y1="14" x2="21" y2="14" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
          <text x="24" y="14" fontSize="7" fontWeight="bold" fill="#0284c7">T</text>
        </svg>
      );

    case 'grafcet_action':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="3" y1="14" x2="8" y2="14" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="8" y="7" width="18" height="14" rx="2" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" />
          <text x="17" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#1d4ed8" fontFamily="monospace">ACT</text>
        </svg>
      );

    case 'grafcet_and_divergence':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="10" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="4" y1="10" x2="24" y2="10" stroke="#0f172a" strokeWidth="2" />
          <line x1="4" y1="13" x2="24" y2="13" stroke="#0f172a" strokeWidth="2" />
          <line x1="8" y1="13" x2="8" y2="25" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="20" y1="13" x2="20" y2="25" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'grafcet_or_divergence':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="12" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="24" y2="12" stroke="#0f172a" strokeWidth="2" />
          <line x1="8" y1="12" x2="8" y2="25" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="20" y1="12" x2="20" y2="25" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'grafcet_jump':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="14" y1="3" x2="14" y2="16" stroke="#0f172a" strokeWidth="1.5" />
          <path d="M 10 16 L 14 22 L 18 16 Z" fill="#2563eb" />
          <text x="14" y="27" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#2563eb">→0</text>
        </svg>
      );

    // ----------------------------------------------------
    // PLC (CONTROLADORES Y LADDER)
    // ----------------------------------------------------
    case 'plc_cpu_s71200':
    case 'plc_s7_1200':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="3" y="4" width="22" height="20" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <rect x="5" y="6" width="18" height="6" fill="#1e293b" rx="1" />
          <circle cx="8" cy="9" r="1.2" fill="#10b981" />
          <circle cx="11" cy="9" r="1.2" fill="#eab308" />
          <circle cx="14" cy="9" r="1.2" fill="#ef4444" />
          <text x="14" y="18" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#38bdf8" fontFamily="sans-serif">S7-1200</text>
        </svg>
      );

    case 'plc_logo':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="4" y="4" width="20" height="20" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <rect x="7" y="8" width="14" height="8" rx="1" fill="#0369a1" />
          <text x="14" y="14" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#ffffff" fontFamily="monospace">LOGO!</text>
          <circle cx="10" cy="20" r="1" fill="#10b981" />
          <circle cx="14" cy="20" r="1" fill="#10b981" />
          <circle cx="18" cy="20" r="1" fill="#10b981" />
        </svg>
      );

    case 'plc_input_module':
    case 'plc_input':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="4" y="5" width="20" height="18" rx="2" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          <text x="14" y="13" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">DI</text>
          <div className="flex">
            {[8, 12, 16, 20].map(cx => (
              <circle key={cx} cx={cx} cy="18" r="1.2" fill="#10b981" />
            ))}
          </div>
        </svg>
      );

    case 'plc_output_module':
    case 'plc_output':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="4" y="5" width="20" height="18" rx="2" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
          <text x="14" y="13" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">DQ</text>
          {[8, 12, 16, 20].map(cx => (
            <circle key={cx} cx={cx} cy="18" r="1.2" fill="#ef4444" />
          ))}
        </svg>
      );

    case 'plc_ladder_contact_no':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="3" y1="14" x2="10" y2="14" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="10" y1="7" x2="10" y2="21" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="7" x2="18" y2="21" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="14" x2="25" y2="14" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      );

    case 'plc_ladder_contact_nc':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="3" y1="14" x2="10" y2="14" stroke="#0f172a" strokeWidth="1.8" />
          <line x1="10" y1="7" x2="10" y2="21" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="7" x2="18" y2="21" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="20" x2="19" y2="8" stroke="#dc2626" strokeWidth="1.8" />
          <line x1="18" y1="14" x2="25" y2="14" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      );

    case 'plc_ladder_coil':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="3" y1="14" x2="9" y2="14" stroke="#0f172a" strokeWidth="1.8" />
          <path d="M 11 8 A 6 6 0 0 0 11 20" stroke="#2563eb" strokeWidth="2" fill="none" />
          <path d="M 17 8 A 6 6 0 0 1 17 20" stroke="#2563eb" strokeWidth="2" fill="none" />
          <line x1="19" y1="14" x2="25" y2="14" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      );

    case 'plc_ladder_coil_set':
    case 'plc_ladder_coil_reset': {
      const isSet = type.includes('set');
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <line x1="3" y1="14" x2="8" y2="14" stroke="#0f172a" strokeWidth="1.8" />
          <path d="M 10 8 A 6 6 0 0 0 10 20" stroke={isSet ? "#16a34a" : "#dc2626"} strokeWidth="2" fill="none" />
          <text x="14" y="16.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={isSet ? "#16a34a" : "#dc2626"}>
            {isSet ? 'S' : 'R'}
          </text>
          <path d="M 18 8 A 6 6 0 0 1 18 20" stroke={isSet ? "#16a34a" : "#dc2626"} strokeWidth="2" fill="none" />
          <line x1="20" y1="14" x2="25" y2="14" stroke="#0f172a" strokeWidth="1.8" />
        </svg>
      );
    }

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
          <rect x="5" y="5" width="18" height="18" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
          <text x="14" y="16.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#475569">?</text>
        </svg>
      );
  }
};
