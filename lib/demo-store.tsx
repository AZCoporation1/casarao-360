"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Event, Table, Reservation, OperationalAlert, WaitlistEntry } from './types';
import { mockEvents, mockTables, mockReservations, mockAlerts } from './mock-data';

// Incrementar quando o layout de mesas ou eventos mudar para invalidar cache antigo
const DEMO_VERSION = 3; // v3 = 11 eventos oficiais 2026 + 54 mesas / 192 lugares

interface DemoState {
  events: Event[];
  tables: Table[];
  reservations: Reservation[];
  alerts: OperationalAlert[];
  waitlist: WaitlistEntry[];
  isInitialized: boolean;
}

type DemoAction = 
  | { type: 'INIT'; payload: DemoState }
  | { type: 'CREATE_RESERVATION'; payload: Reservation }
  | { type: 'UPDATE_RESERVATION_STATUS'; payload: { id: string, status: Reservation['status'] } }
  | { type: 'ADD_TO_WAITLIST'; payload: WaitlistEntry }
  | { type: 'RESOLVE_ALERT'; payload: string }
  | { type: 'UPDATE_TABLE_STATUS'; payload: { id: string, status: Table['status'] } };

const initialState: DemoState = {
  events: mockEvents,
  tables: mockTables,
  reservations: mockReservations,
  alerts: mockAlerts,
  waitlist: [],
  isInitialized: false,
};

function demoReducer(state: DemoState, action: DemoAction): DemoState {
  let newState = state;
  switch (action.type) {
    case 'INIT':
      newState = { ...action.payload, isInitialized: true };
      break;
    case 'CREATE_RESERVATION':
      newState = {
        ...state,
        reservations: [...state.reservations, action.payload],
        tables: state.tables.map(t => t.id === action.payload.tableId ? { ...t, status: 'aguardando' } : t),
      };
      break;
    case 'UPDATE_RESERVATION_STATUS': {
      const reservation = state.reservations.find(r => r.id === action.payload.id);
      let newTableStatus: Table['status'] = 'livre';
      if (action.payload.status === 'confirmada') newTableStatus = 'reservada'; // Ou ocupada dependendo do checkin
      else if (action.payload.status === 'pendente') newTableStatus = 'aguardando';

      newState = {
        ...state,
        reservations: state.reservations.map(r => r.id === action.payload.id ? { ...r, status: action.payload.status } : r),
        tables: reservation ? state.tables.map(t => t.id === reservation.tableId ? { ...t, status: action.payload.status === 'cancelada' ? 'livre' : newTableStatus } : t) : state.tables,
      };
      break;
    }
    case 'ADD_TO_WAITLIST':
      newState = {
        ...state,
        waitlist: [...state.waitlist, action.payload],
      };
      break;
    case 'RESOLVE_ALERT':
      newState = {
        ...state,
        alerts: state.alerts.map(a => a.id === action.payload ? { ...a, read: true } : a),
      };
      break;
    case 'UPDATE_TABLE_STATUS':
      newState = {
        ...state,
        tables: state.tables.map(t => t.id === action.payload.id ? { ...t, status: action.payload.status } : t),
      };
      break;
    default:
      return state;
  }
  
  if (action.type !== 'INIT' && typeof window !== 'undefined') {
    localStorage.setItem('casarao_demo_state', JSON.stringify(newState));
  }
  return newState;
}

const DemoContext = createContext<{ state: DemoState; dispatch: React.Dispatch<DemoAction> } | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, initialState);

  useEffect(() => {
    const savedVersion = localStorage.getItem('casarao_demo_version');
    const saved = localStorage.getItem('casarao_demo_state');
    
    if (saved && savedVersion === String(DEMO_VERSION)) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'INIT', payload: parsed });
      } catch (e) {
        localStorage.removeItem('casarao_demo_state');
        dispatch({ type: 'INIT', payload: initialState });
      }
    } else {
      // Cache stale ou inexistente — usar dados frescos
      localStorage.removeItem('casarao_demo_state');
      localStorage.setItem('casarao_demo_version', String(DEMO_VERSION));
      dispatch({ type: 'INIT', payload: initialState });
    }
  }, []);

  return (
    <DemoContext.Provider value={{ state, dispatch }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoStore() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoStore must be used within a DemoProvider');
  }
  return context;
}
