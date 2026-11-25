import { WorkspaceView } from '../../components/layout/TinkerHeader';
import { TiaLanguage } from '../plc/tiaEngine';

export type PlantRouteMode = 'conveyor' | 'tank' | 'pneumatic' | 'bottling';
export type RouteScope = 'landing' | 'studio' | 'invitado' | 'compartido';

export interface ParsedAppRoute {
  scope: RouteScope;
  view: WorkspaceView;
  tiaLang?: TiaLanguage;
  plantMode?: PlantRouteMode;
  authModal?: 'login' | 'signup' | null;
  projectsModal?: 'projects' | 'exams' | null;
  exportModal?: 'import' | 'export' | null;
  faultsOpen?: boolean;
  reportOpen?: boolean;
  shareSlug?: string | null;
}

const PLANT_SLUG_TO_MODE: Record<string, PlantRouteMode> = {
  cinta: 'conveyor',
  conveyor: 'conveyor',
  tanque: 'tank',
  tank: 'tank',
  neumatica: 'pneumatic',
  pneumatic: 'pneumatic',
  embotelladora: 'bottling',
  bottling: 'bottling'
};

const PLANT_MODE_TO_SLUG: Record<PlantRouteMode, string> = {
  conveyor: 'cinta',
  tank: 'tanque',
  pneumatic: 'neumatica',
  bottling: 'embotelladora'
};

const PLANT_MODE_LABEL: Record<PlantRouteMode, string> = {
  conveyor: 'Cinta',
  tank: 'Tanque',
  pneumatic: 'Neumática',
  bottling: 'Embotelladora'
};

const TIA_SLUG_TO_LANG: Record<string, TiaLanguage> = {
  lad: 'LAD',
  ladder: 'LAD',
  scl: 'SCL',
  grafcet: 'GRAFCET'
};

export function parseBrowserLocation(pathname: string, search: string): ParsedAppRoute {
  const params = new URLSearchParams(search);
  const legacyShare = params.get('share')?.trim();
  if (legacyShare) {
    return {
      scope: 'compartido',
      view: 'cad',
      shareSlug: legacyShare
    };
  }

  const segments = pathname
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .map(s => decodeURIComponent(s));

  if (segments.length === 0) {
    return { scope: 'landing', view: 'cad' };
  }

  const first = segments[0].toLowerCase();
  const second = (segments[1] || '').toLowerCase();
  const third = (segments[2] || '').toLowerCase();

  if (first === 'login' || first === 'iniciar-sesion') {
    return { scope: 'landing', view: 'cad', authModal: 'login' };
  }
  if (first === 'registro' || first === 'signup' || first === 'registrarse') {
    return { scope: 'landing', view: 'cad', authModal: 'signup' };
  }
  if (first === 'compartido' || first === 'share') {
    const slug = segments[1]?.trim() || null;
    if (slug) {
      return { scope: 'compartido', view: 'cad', shareSlug: slug };
    }
    return { scope: 'landing', view: 'cad' };
  }

  if (first === 'studio' || first === 'invitado') {
    const scope: RouteScope = first === 'studio' ? 'studio' : 'invitado';

    if (!second || second === 'cad' || second === 'esquema') {
      return { scope, view: 'cad' };
    }
    if (second === 'tia' || second === 'codigo-tia') {
      return {
        scope,
        view: 'tia',
        tiaLang: TIA_SLUG_TO_LANG[third] || 'LAD'
      };
    }
    if (second === 'planta' || second === 'planta-2d') {
      return {
        scope,
        view: 'plant',
        plantMode: PLANT_SLUG_TO_MODE[third] || 'conveyor'
      };
    }
    if (second === 'proyectos') {
      return { scope, view: 'cad', projectsModal: 'projects' };
    }
    if (second === 'examenes') {
      return { scope, view: 'cad', projectsModal: 'exams' };
    }
    if (second === 'importar') {
      return { scope, view: 'cad', exportModal: 'import' };
    }
    if (second === 'exportar') {
      return { scope, view: 'cad', exportModal: 'export' };
    }
    if (second === 'fallas') {
      return { scope, view: 'cad', faultsOpen: true };
    }
    if (second === 'reporte' || second === 'bom') {
      return { scope, view: 'cad', reportOpen: true };
    }

    return { scope, view: 'cad' };
  }

  return { scope: 'landing', view: 'cad' };
}

export interface BrowserRouteState {
  isAuthenticated: boolean;
  enteredGuestWorkspace: boolean;
  sharedSlug: string | null;
  activeView: WorkspaceView;
  tiaLanguage: TiaLanguage;
  plantMode: PlantRouteMode;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  projectsModalTab: 'projects' | 'exams' | null;
  exportModalTab: 'import' | 'export' | null;
  isFaultsOpen: boolean;
  isReportOpen: boolean;
}

export function buildBrowserPath(state: BrowserRouteState): string {
  if (state.sharedSlug) {
    return `/compartido/${encodeURIComponent(state.sharedSlug)}`;
  }

  const inLanding = !state.isAuthenticated && !state.enteredGuestWorkspace;
  if (inLanding) {
    if (state.authModalOpen) {
      return state.authModalMode === 'signup' ? '/registro' : '/login';
    }
    return '/';
  }

  const prefix = state.isAuthenticated ? '/studio' : '/invitado';

  if (state.projectsModalTab === 'projects') return `${prefix}/proyectos`;
  if (state.projectsModalTab === 'exams') return `${prefix}/examenes`;
  if (state.exportModalTab === 'import') return `${prefix}/importar`;
  if (state.exportModalTab === 'export') return `${prefix}/exportar`;
  if (state.isFaultsOpen) return `${prefix}/fallas`;
  if (state.isReportOpen) return `${prefix}/reporte`;

  if (state.activeView === 'tia') {
    const langSlug = state.tiaLanguage.toLowerCase();
    return `${prefix}/tia/${langSlug}`;
  }
  if (state.activeView === 'plant') {
    const plantSlug = PLANT_MODE_TO_SLUG[state.plantMode] || 'cinta';
    return `${prefix}/planta/${plantSlug}`;
  }

  return `${prefix}/cad`;
}

export function getRouteTitle(state: BrowserRouteState): string {
  if (state.sharedSlug) {
    return 'Proyecto Compartido · Baru Studio';
  }
  const inLanding = !state.isAuthenticated && !state.enteredGuestWorkspace;
  if (inLanding) {
    if (state.authModalOpen) {
      return state.authModalMode === 'signup'
        ? 'Crear Cuenta · Baru Studio'
        : 'Iniciar Sesión · Baru Studio';
    }
    return 'Baru Studio — CADe_SIMU Web Pro + TIA Portal S7-1200';
  }

  const suffix = state.isAuthenticated ? 'Baru Studio' : 'Baru Studio (Invitado)';
  if (state.projectsModalTab === 'projects') return `Mis Proyectos · ${suffix}`;
  if (state.projectsModalTab === 'exams') return `Historial de Exámenes · ${suffix}`;
  if (state.exportModalTab === 'import') return `Importar Proyecto · ${suffix}`;
  if (state.exportModalTab === 'export') return `Exportar Proyecto · ${suffix}`;
  if (state.isFaultsOpen) return `Inyector de Averías · ${suffix}`;
  if (state.isReportOpen) return `Lista de Materiales (BOM) · ${suffix}`;

  if (state.activeView === 'tia') {
    return `Código TIA (${state.tiaLanguage}) · ${suffix}`;
  }
  if (state.activeView === 'plant') {
    return `Planta 2D (${PLANT_MODE_LABEL[state.plantMode]}) · ${suffix}`;
  }
  return `Esquema CAD · ${suffix}`;
}
