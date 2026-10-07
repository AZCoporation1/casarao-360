"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VenueMap } from '@/components/map/VenueMap';
import { Table, Event } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info, MapPin, Users, Loader2, CalendarOff, Clock, Bell, MessageCircle, ArrowRight, Layers, UserCheck, ShieldCheck, Lock, Eye, EyeOff, LogIn, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useDemoStore } from '@/lib/demo-store';
import { isMockMode } from '@/lib/data/data-source';
import {
  createAuthReservationAction,
  signUpAndReserveAction,
  signInAndReserveAction,
} from '@/lib/actions/reservations.actions';
import { createLargePartyRequestAction } from '@/lib/actions/large-party.actions';
import { registerInterestAction } from '@/lib/actions/interest.actions';
import { saveBookingDraftAction, clearBookingDraftAction } from '@/lib/actions/booking-draft.actions';
import type { BookingDraft } from '@/lib/booking-draft';
import { useEventTables } from '@/lib/realtime/use-event-tables';
import { getSectorLabel } from '@/lib/map/casarao-layout';
import { getBookingStateLabel } from '@/lib/booking-policy';
import { buildWhatsAppReservationUrl, formatEventDatePtBR, type PublicReservationSettings } from '@/lib/whatsapp';
import type { ReservationAuthContext } from './page';

interface ReservationClientProps {
  eventoId: string;
  event: Event;
  initialTables: Table[];
  settings: PublicReservationSettings;
  allowedPairs: [string, string][];
  initialDraft: BookingDraft | null;
  initialAuth: ReservationAuthContext | null;
}

// Restauração do draft (§43) — computada de forma PURA no primeiro render.
function restoreDraft(
  initialDraft: BookingDraft | null,
  initialTables: Table[],
  mockMode: boolean
): { ids: string[]; notice: string; partySize: number | null } {
  if (mockMode || !initialDraft || initialDraft.selectedTableIds.length === 0) {
    return { ids: [], notice: '', partySize: null };
  }
  const stillFree = initialTables.filter(
    t => initialDraft.selectedTableIds.includes(t.id) && t.status === 'livre'
  ).slice(0, 2);
  if (stillFree.length === 0) {
    return { ids: [], notice: 'As mesas da sua seleção anterior já foram reservadas. Escolha novas mesas no mapa.', partySize: null };
  }
  const cap = stillFree.reduce((s, t) => s + t.capacity, 0);
  const notice = stillFree.length < initialDraft.selectedTableIds.length
    ? 'Uma das mesas da sua seleção anterior foi reservada por outra pessoa. Restauramos as que continuam livres.'
    : 'Sua seleção anterior foi restaurada. Continue de onde parou.';
  return { ids: stillFree.map(t => t.id), notice, partySize: Math.min(initialDraft.partySize || 2, cap) };
}

export function ReservationClient({ eventoId, event, initialTables, settings, allowedPairs, initialDraft, initialAuth }: ReservationClientProps) {
  const { state, dispatch } = useDemoStore();
  const mockMode = isMockMode();
  const router = useRouter();

  // Realtime (§69): fetch inicial do servidor + subscription + polling fallback
  const { tables, setTables } = useEventTables(eventoId, mockMode && state.isInitialized ? state.tables : initialTables);

  // Auth derivado NO SERVIDOR (page.tsx) — nada de getUser() no browser aqui:
  // evita corrida com o canal realtime e o server revalida em toda action.
  const authUser = initialAuth;

  const [restored] = useState(() => restoreDraft(initialDraft, initialTables, mockMode));
  // Seleção guarda apenas IDs; as mesas válidas são DERIVADAS do estado atual
  // do mapa — uma mesa tomada por outro cliente sai da seleção sozinha.
  const [selectedIds, setSelectedIds] = useState<string[]>(restored.ids);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(restored.notice);

  const [formData, setFormData] = useState({
    name: initialAuth?.name ?? '',
    email: initialAuth?.email ?? '',
    phone: initialAuth?.phone ?? '',
    cpf: initialAuth?.cpfMasked ?? '',
    password: '',
    people: restored.partySize ?? 2,
  });
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [interestForm, setInterestForm] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isInterestSuccess, setIsInterestSuccess] = useState(false);
  const [reservationCode, setReservationCode] = useState('');
  const [error, setError] = useState('');
  const [limitNotice, setLimitNotice] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [leadCode, setLeadCode] = useState('');
  const draftClearedRef = useRef(false);
  const idempotencyRef = useRef<{ sel: string; key: string } | null>(null);

  const whatsappAvailable = Boolean(settings?.whatsappEnabled && settings?.whatsappWaMeNumber);

  // Draft consumido: limpa o cookie (efeito externo, sem setState)
  useEffect(() => {
    if (mockMode || !initialDraft || draftClearedRef.current) return;
    draftClearedRef.current = true;
    clearBookingDraftAction();
  }, [mockMode, initialDraft]);

  // Update tables from demo store when in mock mode
  useEffect(() => {
    if (mockMode && state.isInitialized) {
      setTables(state.tables);
    }
  }, [mockMode, state.isInitialized, state.tables, setTables]);

  // ---- Derivações da seleção (sempre a partir do mapa atual) ----
  const selectedTables = useMemo(
    () => selectedIds
      .map(id => tables.find(t => t.id === id))
      .filter((t): t is Table => !!t && (t.status === 'livre' || mockMode)),
    [selectedIds, tables, mockMode]
  );

  // Mesas que estavam selecionadas mas deixaram de estar livres (realtime)
  const takenSelectedNumbers = useMemo(
    () => selectedIds
      .map(id => tables.find(t => t.id === id))
      .filter((t): t is Table => !!t && t.status !== 'livre' && !mockMode)
      .map(t => t.number),
    [selectedIds, tables, mockMode]
  );

  const totalSelectedCapacity = selectedTables.reduce((acc, t) => acc + t.capacity, 0);
  const selectedTableIds = selectedTables.map(t => t.id);

  const maxParty = settings?.maxSelfServicePartySize ?? 8;
  const isLargeParty = formData.people > maxParty;

  // Pares combináveis normalizados para lookup O(1)
  const allowedPairSet = useMemo(() => {
    const set = new Set<string>();
    for (const [a, b] of allowedPairs) {
      set.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    return set;
  }, [allowedPairs]);

  // Estado "roxo": com exatamente 1 mesa selecionada, toda mesa livre sem
  // regra de combinação com a selecionada fica incompatível (UI preventiva —
  // o servidor continua sendo a autoridade deny-by-default).
  const incompatibleTableIds = useMemo(() => {
    if (mockMode || selectedTables.length !== 1) return [];
    const sel = selectedTables[0];
    return tables
      .filter(t =>
        t.id !== sel.id &&
        t.status === 'livre' &&
        !allowedPairSet.has(t.id < sel.id ? `${t.id}|${sel.id}` : `${sel.id}|${t.id}`)
      )
      .map(t => t.id);
  }, [mockMode, selectedTables, tables, allowedPairSet]);

  // Chave de idempotência estável por seleção (duplo clique não duplica).
  // Gerada em event handler — nunca durante o render.
  const getIdempotencyKey = () => {
    const sel = selectedTableIds.slice().sort().join('_');
    if (!idempotencyRef.current || idempotencyRef.current.sel !== sel) {
      idempotencyRef.current = { sel, key: `resv_${eventoId}_${sel}_${Date.now()}` };
    }
    return idempotencyRef.current.key;
  };

  const handleSelectTable = (table: Table) => {
    setError('');
    setLimitNotice(false);
    // Base = seleção VÁLIDA atual (mesas tomadas via realtime já caíram fora)
    const current = selectedTables;

    // If table is already selected, unselect it
    if (current.some(t => t.id === table.id)) {
      const next = current.filter(t => t.id !== table.id);
      setSelectedIds(next.map(t => t.id));
      const nextCap = next.reduce((s, t) => s + t.capacity, 0);
      if (nextCap > 0) {
        setFormData(prev => ({ ...prev, people: Math.min(prev.people, nextCap) }));
      }
      return;
    }

    // If 0 selected, add as 1st
    if (current.length === 0) {
      setSelectedIds([table.id]);
      setFormData(prev => ({ ...prev, people: Math.min(prev.people || 2, table.capacity) }));
      return;
    }

    // If 1 selected, allow adding a 2nd COMPATIBLE table
    if (current.length === 1) {
      if (incompatibleTableIds.includes(table.id)) {
        setError(`A Mesa ${table.number} não pode ser combinada com a Mesa ${current[0].number}. Escolha uma mesa destacada ou fale conosco no WhatsApp.`);
        return;
      }
      const next = [...current, table];
      setSelectedIds(next.map(t => t.id));
      const combinedCap = next.reduce((s, t) => s + t.capacity, 0);
      setFormData(prev => ({ ...prev, people: Math.min(prev.people || 2, combinedCap) }));
      return;
    }

    // If 2 already selected: NÃO substitui — máximo de 2 mesas por reserva
    // online; acima disso, reserva personalizada via WhatsApp (handoff §57).
    setLimitNotice(true);
  };

  // Salva a seleção como draft e navega para login/cadastro dedicado
  const goToAuthPreservingSelection = async (destination: '/entrar' | '/criar-conta') => {
    await saveBookingDraftAction({
      eventId: eventoId,
      partySize: formData.people,
      selectedTableIds,
      returnUrl: `/reservar/${eventoId}`,
      eventName: event.title,
    });
    router.push(destination);
  };

  // Handle WhatsApp large party flow
  const handleWhatsAppLargeParty = async () => {
    if (!whatsappAvailable || !settings.whatsappWaMeNumber) {
      setError('Contato por WhatsApp temporariamente indisponível. Tente novamente mais tarde.');
      return;
    }
    setIsCreatingLead(true);
    setError('');

    const idempKey = `lpr_${eventoId}_${formData.phone || 'anon'}_${Date.now()}`;

    const result = await createLargePartyRequestAction({
      eventId: eventoId,
      name: formData.name || 'Cliente via Casarão 360',
      phone: formData.phone || '',
      partySize: formData.people,
      sectorInterest: selectedTables.length > 0 ? getSectorLabel(selectedTables[0].sector) : undefined,
      tableInterest: selectedTables.map(t => t.number),
      idempotencyKey: idempKey,
    });

    if (result.success && result.publicCode) {
      setLeadCode(result.publicCode);
      const url = buildWhatsAppReservationUrl(
        settings.whatsappWaMeNumber,
        {
          eventTitle: event.title,
          eventDate: event.eventDate ? formatEventDatePtBR(event.eventDate) : 'A definir',
          partySize: formData.people,
          sector: selectedTables.length > 0 ? getSectorLabel(selectedTables[0].sector) : undefined,
          tableNumbers: selectedTables.map(t => `Mesa ${t.number}`).join(', ') || undefined,
          leadCode: result.publicCode,
        }
      );
      setWhatsappUrl(url);
    } else {
      setError(result.error || 'Erro ao criar solicitação.');
    }
    setIsCreatingLead(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTables.length === 0) {
      setError('Selecione pelo menos uma mesa no mapa.');
      return;
    }

    const nameToUse = formData.name.trim();
    const emailToUse = formData.email.trim();
    const phoneToUse = formData.phone.trim();
    const cpfToUse = formData.cpf.trim();
    const passwordToUse = formData.password;

    if (formData.people > totalSelectedCapacity) {
      setError(`As mesas selecionadas suportam no máximo ${totalSelectedCapacity} pessoas.`);
      return;
    }

    if (formData.people > maxParty) {
      setError(`Reservas para mais de ${maxParty} pessoas devem ser feitas via WhatsApp.`);
      return;
    }

    if (mockMode) {
      // Mock mode: use demo store
      const primaryTable = selectedTables[0];
      const currentTable = state.tables.find(t => t.id === primaryTable.id);
      if (currentTable?.status !== 'livre') {
        setError('Esta mesa não está mais disponível.');
        return;
      }
      if (!nameToUse || !phoneToUse) {
        setError('Preencha nome e WhatsApp.');
        return;
      }

      setIsSubmitting(true);
      setError('');
      setTimeout(() => {
        dispatch({
          type: 'CREATE_RESERVATION',
          payload: {
            id: `res-${Date.now()}`,
            eventId: eventoId,
            tableId: primaryTable.id,
            customerName: nameToUse,
            customerPhone: phoneToUse,
            customerCpf: cpfToUse,
            peopleCount: formData.people,
            status: 'pendente',
            createdAt: new Date().toISOString()
          }
        });
        setReservationCode(`DEMO-${Date.now().toString(36).toUpperCase()}`);
        setIsSuccess(true);
        setIsSubmitting(false);
      }, 1500);
      return;
    }

    // ---- Supabase mode: conta obrigatória ----
    setIsSubmitting(true);
    setError('');
    const idempotencyKey = getIdempotencyKey();

    try {
      let result;
      if (authUser) {
        // Sessão existente — identidade derivada no servidor
        result = await createAuthReservationAction({
          eventId: eventoId,
          eventTableIds: selectedTableIds,
          partySize: formData.people,
          fullName: nameToUse || undefined,
          phone: phoneToUse || undefined,
          cpf: cpfToUse && !cpfToUse.includes('*') ? cpfToUse : undefined,
          idempotencyKey,
        });
      } else if (authMode === 'login') {
        if (!emailToUse || !passwordToUse) {
          setError('Informe e-mail e senha para entrar.');
          setIsSubmitting(false);
          return;
        }
        result = await signInAndReserveAction({
          eventId: eventoId,
          eventTableIds: selectedTableIds,
          partySize: formData.people,
          email: emailToUse,
          password: passwordToUse,
          idempotencyKey,
        });
      } else {
        // Cadastro rápido inline + reserva em um passo
        if (!nameToUse || !emailToUse || !phoneToUse || !cpfToUse || !passwordToUse) {
          setError('Preencha todos os campos (Nome, E-mail, WhatsApp, CPF e Senha) para criar sua conta e reservar.');
          setIsSubmitting(false);
          return;
        }
        result = await signUpAndReserveAction({
          eventId: eventoId,
          eventTableIds: selectedTableIds,
          partySize: formData.people,
          fullName: nameToUse,
          email: emailToUse,
          phone: phoneToUse,
          cpf: cpfToUse,
          password: passwordToUse,
          idempotencyKey,
        });
      }

      if (result.success) {
        await clearBookingDraftAction();
        setReservationCode(result.reservationCode || '');
        if (result.needsEmailConfirmation || !result.reservationId) {
          // Sem sessão (projeto exigindo confirmação de email) — mostra o
          // código em tela com orientação, em vez de redirecionar.
          setNeedsEmailConfirmation(true);
          setIsSuccess(true);
        } else {
          // Fim da tela morta (handoff §46): segue direto para o detalhe
          router.push(`/minha-conta/reservas/${result.reservationId}`);
          router.refresh();
          return; // mantém o spinner até a navegação
        }
      } else if (result.errorCode === 'email_already_registered') {
        setAuthMode('login');
        setError(result.error || 'Este e-mail já possui conta. Entre com sua senha.');
      } else if (result.errorCode === 'active_reservation_exists') {
        setError('Você já possui uma reserva para este evento. Acesse Minhas Reservas para vê-la.');
      } else {
        setError(result.error || 'Erro ao processar reserva.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserFullyIdentified = Boolean(authUser && formData.name && formData.email && formData.phone && formData.cpf);

  const bookingState = event.bookingState;

  // ---- BLOCKED STATES ----
  // Completed event
  if (bookingState === 'completed') {
    return (
      <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-marrom-madeira/20 flex items-center justify-center mb-8">
          <CalendarOff className="w-12 h-12 text-creme-gastronomico/50" />
        </div>
        <h1 className="text-3xl font-bold text-creme-gastronomico mb-4">Evento Realizado</h1>
        <p className="text-creme-gastronomico/70 text-lg mb-2">
          <strong className="text-ambar-premium">{event.title}</strong> já foi realizado.
        </p>
        <p className="text-creme-gastronomico/50 text-sm mb-8">
          Confira nossa programação para descobrir os próximos eventos e garantir sua experiência.
        </p>
        <Button variant="premium" className="px-8 h-12 text-base font-bold" asChild>
          <Link href="/eventos">Ver Próximos Eventos</Link>
        </Button>
      </main>
    );
  }

  // Announced / Priority Only — Registration of Interest
  if (bookingState === 'announced' || bookingState === 'priority_only') {
    const isAnnounced = bookingState === 'announced';
    const opensOnFormatted = event.publicBookingOpensOn
      ? new Date(event.publicBookingOpensOn + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
      : null;

    return (
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <Link href="/eventos" className="text-creme-gastronomico/60 hover:text-laranja-fogo text-sm mb-6 inline-block transition-colors">&larr; Voltar para Eventos</Link>

        <Card className="border-ambar-premium/30 bg-preto-carvao/80 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-ambar-premium/10 border border-ambar-premium/30 flex items-center justify-center mx-auto mb-4">
              {isAnnounced ? <Clock className="w-8 h-8 text-ambar-premium" /> : <Bell className="w-8 h-8 text-ambar-premium" />}
            </div>
            <Badge variant="warning" className="mx-auto mb-2">
              {getBookingStateLabel(bookingState)}
            </Badge>
            <CardTitle className="text-2xl md:text-3xl text-creme-gastronomico">{event.title}</CardTitle>
            <CardDescription className="text-creme-gastronomico/70 text-base mt-2">
              {isAnnounced
                ? opensOnFormatted
                  ? `As reservas públicas abrem em ${opensOnFormatted}. Cadastre-se para ser avisado com prioridade.`
                  : 'As reservas para este evento abrirão em breve. Deixe seu contato para ser avisado em primeira mão.'
                : 'Neste momento, as reservas estão disponíveis exclusivamente para membros prioritários. Cadastre-se para a abertura geral.'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {isInterestSuccess ? (
              <div className="bg-verde-oliva/10 border border-verde-oliva/30 rounded-xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-verde-oliva mx-auto" />
                <h4 className="font-bold text-creme-gastronomico text-lg">Interesse registrado com sucesso!</h4>
                <p className="text-creme-gastronomico/70 text-sm">
                  Avisaremos você pelo WhatsApp assim que as reservas forem abertas para este evento.
                </p>
                <Button variant="outline" asChild className="mt-4 border-marrom-madeira/40">
                  <Link href="/eventos">Explorar outros eventos</Link>
                </Button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!interestForm.name || !interestForm.phone) {
                    setError('Preencha seu nome e WhatsApp.');
                    return;
                  }
                  setIsSubmitting(true);
                  setError('');
                  const result = await registerInterestAction({
                    eventId: eventoId,
                    fullName: interestForm.name,
                    phone: interestForm.phone,
                  });
                  if (result.success) {
                    setIsInterestSuccess(true);
                  } else {
                    setError(result.error || 'Erro ao registrar interesse.');
                  }
                  setIsSubmitting(false);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-creme-gastronomico/90">Seu Nome Completo *</label>
                  <Input
                    placeholder="Ex: Maria Santos"
                    value={interestForm.name}
                    onChange={e => setInterestForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-creme-gastronomico/90">WhatsApp para Notificação *</label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={interestForm.phone}
                    onChange={e => setInterestForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                {error && (
                  <div className="bg-vermelho-brasa/10 border border-vermelho-brasa/50 text-vermelho-brasa text-sm p-3 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  variant="premium"
                  className="w-full h-12 text-base font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                    </span>
                  ) : (
                    'Quero ser avisado na abertura'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // ---- OPEN / SOLD OUT / DEFAULT — show map ----

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/eventos" className="text-creme-gastronomico/60 hover:text-laranja-fogo text-sm mb-4 inline-block transition-colors">&larr; Voltar para Eventos</Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-creme-gastronomico mb-2">{event.title}</h1>
            <p className="text-creme-gastronomico/70 flex items-center gap-2 font-medium">
              <MapPin className="w-4 h-4 text-laranja-fogo" /> O Casarão - Salão Principal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="premium" className="text-sm px-4 py-2 shadow-lg">
              {selectedTables.length === 0 ? 'Passo 1: Selecione até 2 mesas' : `${selectedTables.length} mesa(s) selecionada(s)`}
            </Badge>
          </div>
        </div>
        {draftRestoredNotice && (
          <div className="mt-4 bg-ambar-premium/10 border border-ambar-premium/30 rounded-lg p-3 text-sm text-creme-gastronomico/80 flex items-start gap-2">
            <Info className="w-4 h-4 text-ambar-premium mt-0.5 shrink-0" />
            <span>{draftRestoredNotice}</span>
            <button type="button" onClick={() => setDraftRestoredNotice('')} className="ml-auto text-creme-gastronomico/40 hover:text-creme-gastronomico">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {takenSelectedNumbers.length > 0 && (
          <div className="mt-4 bg-vermelho-brasa/10 border border-vermelho-brasa/40 rounded-lg p-3 text-sm text-creme-gastronomico/80 flex items-start gap-2">
            <Info className="w-4 h-4 text-vermelho-brasa mt-0.5 shrink-0" />
            <span>
              {takenSelectedNumbers.map(n => `Mesa ${n}`).join(' e ')} acabou de ser reservada por outra pessoa e saiu da sua seleção.
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(selectedTableIds)}
              className="ml-auto text-creme-gastronomico/40 hover:text-creme-gastronomico"
              aria-label="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mapa do Salão (Left 2 columns) */}
        <div className="lg:col-span-2">
          <VenueMap
            tables={tables}
            onSelectTable={handleSelectTable}
            selectedTableIds={selectedTableIds}
            incompatibleTableIds={incompatibleTableIds}
          />
        </div>

        {/* Side Panel (Right 1 column) */}
        <div className="lg:col-span-1">
          {isSuccess ? (
            <Card className="border-verde-oliva/30 shadow-verde-oliva/10 bg-verde-oliva/5 animate-in fade-in duration-500">
              <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-verde-oliva/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(63,107,47,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-verde-oliva" />
                </div>
                <h3 className="text-2xl font-bold text-creme-gastronomico">Solicitação de reserva recebida!</h3>
                <p className="text-creme-gastronomico/80 leading-relaxed max-w-md text-sm">
                  Sua reserva para <strong className="text-ambar-premium">{selectedTables.map(t => `Mesa ${t.number}`).join(' e ')}</strong> no evento <strong className="text-ambar-premium">{event.title}</strong> foi registrada no sistema.
                </p>

                {reservationCode && (
                  <div className="bg-preto-carvao/80 border border-ambar-premium/30 rounded-xl px-6 py-4 shadow-[0_0_20px_rgba(212,175,55,0.15)] w-full">
                    <span className="text-xs text-creme-gastronomico/60 block mb-1 uppercase tracking-wider font-semibold">Código da Reserva</span>
                    <span className="text-3xl font-mono font-bold text-ambar-premium tracking-widest">{reservationCode}</span>
                  </div>
                )}

                {needsEmailConfirmation ? (
                  <div className="bg-ambar-premium/10 border border-ambar-premium/30 rounded-xl p-4 text-left w-full text-sm text-creme-gastronomico/80 space-y-1">
                    <p className="font-bold text-ambar-premium">Confirme seu e-mail</p>
                    <p>Sua conta foi criada e a reserva registrada. Confirme o e-mail que enviamos para acessar Minha Conta e acompanhar sua reserva.</p>
                  </div>
                ) : (
                  <p className="text-xs text-creme-gastronomico/50 max-w-xs leading-relaxed">
                    Apresente este código na recepção d&apos;O Casarão.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                  {needsEmailConfirmation ? (
                    <Button variant="premium" className="flex-1 font-bold" asChild>
                      <Link href="/entrar">Já confirmei — Entrar</Link>
                    </Button>
                  ) : (
                    <Button variant="premium" className="flex-1 font-bold" asChild>
                      <Link href="/minha-conta/reservas">
                        Ver Minhas Reservas <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 border-marrom-madeira/40" asChild>
                    <Link href="/eventos">Ver Programação</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTables.length > 0 ? (
            <Card className="border-laranja-fogo/30 shadow-laranja-fogo/5 animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader className="bg-marrom-madeira/20 border-b border-marrom-madeira/30 rounded-t-xl pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="text-laranja-fogo font-bold mb-1 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {selectedTables.length === 1 ? 'Mesa Selecionada' : 'Mesas Combinadas (2)'}
                    </CardDescription>
                    <CardTitle className="text-2xl md:text-3xl text-creme-gastronomico">
                      {selectedTables.map(t => `Mesa ${t.number}`).join(' + ')}
                    </CardTitle>
                  </div>
                  <Badge variant="success" className="shadow-sm">
                    Disponível
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {/* Mesas selecionadas — chips removíveis */}
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                  {selectedTables.map(t => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-laranja-fogo/15 border border-laranja-fogo/40 text-creme-gastronomico text-xs font-bold shadow-sm animate-in zoom-in-75 fade-in duration-200"
                    >
                      Mesa {t.number}
                      <span className="text-creme-gastronomico/50 font-medium">· {t.capacity} lug.</span>
                      <button
                        type="button"
                        aria-label={`Remover Mesa ${t.number} da seleção`}
                        onClick={() => handleSelectTable(t)}
                        className="ml-0.5 w-5 h-5 rounded-full flex items-center justify-center text-creme-gastronomico/50 hover:text-vermelho-brasa hover:bg-vermelho-brasa/15 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Table Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-preto-carvao/80 p-3 rounded-xl border border-marrom-madeira/40 shadow-inner">
                    <span className="text-xs text-creme-gastronomico/60 block mb-1 font-medium">Capacidade Total</span>
                    <span className="font-bold text-creme-gastronomico flex items-center gap-1.5 text-sm md:text-base">
                      <Users className="w-4 h-4 text-ambar-premium" /> Até {totalSelectedCapacity} pessoas
                    </span>
                  </div>
                  <div className="bg-preto-carvao/80 p-3 rounded-xl border border-marrom-madeira/40 shadow-inner">
                    <span className="text-xs text-creme-gastronomico/60 block mb-1 font-medium">Setor</span>
                    <span className="font-bold text-creme-gastronomico text-sm md:text-base">
                      {getSectorLabel(selectedTables[0].sector)}
                    </span>
                  </div>
                </div>

                {selectedTables.length === 1 && (
                  <div className="bg-marrom-madeira/10 border border-marrom-madeira/20 rounded-lg p-2.5 text-xs text-creme-gastronomico/70 flex items-center gap-2">
                    <Info className="w-4 h-4 text-ambar-premium shrink-0" />
                    <span>Dica: você pode clicar em uma 2ª mesa destacada para combinar. Mesas em roxo não são combináveis com a sua seleção.</span>
                  </div>
                )}

                {limitNotice && (
                  <div className="bg-ambar-premium/10 border border-ambar-premium/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-5 h-5 text-ambar-premium mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-creme-gastronomico text-sm">Máximo de 2 mesas por reserva online</h4>
                        <p className="text-creme-gastronomico/70 text-xs mt-0.5">
                          Para acomodar grupos maiores, nossa equipe monta a melhor combinação para você via atendimento personalizado.
                        </p>
                      </div>
                    </div>
                    {whatsappAvailable ? (
                      <Button
                        type="button"
                        variant="premium"
                        className="w-full h-10 text-xs font-bold bg-[#25D366] hover:bg-[#22c55e] text-white"
                        onClick={handleWhatsAppLargeParty}
                        disabled={isCreatingLead}
                      >
                        {isCreatingLead ? (
                          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparando...</span>
                        ) : (
                          <><MessageCircle className="w-4 h-4 mr-1.5" /> Falar no WhatsApp para reserva personalizada</>
                        )}
                      </Button>
                    ) : (
                      <p className="text-xs text-creme-gastronomico/50">Contato por WhatsApp temporariamente indisponível.</p>
                    )}
                  </div>
                )}

                {/* Logged in User Summary Card */}
                {authUser && isUserFullyIdentified ? (
                  <div className="bg-ambar-premium/10 border border-ambar-premium/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ambar-premium font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-ambar-premium" /> Reservando como
                      </span>
                      <Badge variant="outline" className="text-[10px] border-verde-oliva/50 text-verde-oliva">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Conta Conectada
                      </Badge>
                    </div>
                    <div className="text-sm text-creme-gastronomico font-medium">
                      <p className="font-bold text-base">{formData.name}</p>
                      <p className="text-xs text-creme-gastronomico/70">{formData.email} • {formData.phone}</p>
                    </div>
                  </div>
                ) : null}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Sem sessão: cadastro rápido inline (ou login) sem sair da página */}
                  {!authUser && !mockMode && (
                    <>
                      <div className="flex rounded-lg border border-marrom-madeira/40 overflow-hidden text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => { setAuthMode('signup'); setError(''); }}
                          className={authMode === 'signup'
                            ? 'flex-1 py-2.5 bg-laranja-fogo text-preto-carvao flex items-center justify-center gap-1.5'
                            : 'flex-1 py-2.5 bg-preto-carvao/60 text-creme-gastronomico/60 hover:text-creme-gastronomico flex items-center justify-center gap-1.5 transition-colors'}
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Criar conta
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthMode('login'); setError(''); }}
                          className={authMode === 'login'
                            ? 'flex-1 py-2.5 bg-laranja-fogo text-preto-carvao flex items-center justify-center gap-1.5'
                            : 'flex-1 py-2.5 bg-preto-carvao/60 text-creme-gastronomico/60 hover:text-creme-gastronomico flex items-center justify-center gap-1.5 transition-colors'}
                        >
                          <LogIn className="w-3.5 h-3.5" /> Já tenho conta
                        </button>
                      </div>

                      {authMode === 'signup' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">Nome Completo *</label>
                            <Input
                              placeholder="Ex: João da Silva"
                              value={formData.name}
                              autoComplete="name"
                              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">WhatsApp *</label>
                              <Input
                                placeholder="(11) 99999-9999"
                                value={formData.phone}
                                autoComplete="tel"
                                inputMode="tel"
                                onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">CPF *</label>
                              <Input
                                placeholder="000.000.000-00"
                                value={formData.cpf}
                                inputMode="numeric"
                                onChange={e => setFormData(prev => ({...prev, cpf: e.target.value}))}
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">E-mail *</label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          autoComplete="email"
                          onChange={e => setFormData(prev => ({...prev, email: e.target.value}))}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">
                          Senha * {authMode === 'signup' && <span className="normal-case font-normal text-creme-gastronomico/50">(mín. 6 caracteres)</span>}
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-creme-gastronomico/30" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-9 pr-10"
                            value={formData.password}
                            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                            onChange={e => setFormData(prev => ({...prev, password: e.target.value}))}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-creme-gastronomico/30 hover:text-laranja-fogo transition-colors"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-creme-gastronomico/50 leading-relaxed">
                        Sua seleção fica salva.{' '}
                        <button type="button" onClick={() => goToAuthPreservingSelection('/entrar')} className="text-laranja-fogo hover:text-ambar-premium font-semibold underline-offset-2 underline">
                          Prefere entrar pela página de login?
                        </button>
                      </p>
                    </>
                  )}

                  {/* Mock mode: formulário demo simples */}
                  {mockMode && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">Nome Completo *</label>
                        <Input
                          placeholder="Ex: João da Silva"
                          value={formData.name}
                          onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">WhatsApp *</label>
                          <Input
                            placeholder="(11) 99999-9999"
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">CPF *</label>
                          <Input
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={e => setFormData(prev => ({...prev, cpf: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Usuário logado sem cadastro completo */}
                  {authUser && !isUserFullyIdentified && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">Nome Completo *</label>
                        <Input
                          placeholder="Ex: João da Silva"
                          value={formData.name}
                          onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">WhatsApp *</label>
                          <Input
                            placeholder="(11) 99999-9999"
                            value={formData.phone}
                            onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">CPF *</label>
                          <Input
                            placeholder="000.000.000-00"
                            value={formData.cpf}
                            onChange={e => setFormData(prev => ({...prev, cpf: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-creme-gastronomico/80">Quantidade de Pessoas *</label>
                      <span className="text-xs text-creme-gastronomico/50">(Máx. {Math.min(totalSelectedCapacity, maxParty)})</span>
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={Math.min(totalSelectedCapacity, maxParty)}
                      value={formData.people}
                      onChange={e => setFormData(prev => ({...prev, people: parseInt(e.target.value) || 1}))}
                      required
                    />
                    {/* Medidor de ocupação das mesas selecionadas */}
                    {totalSelectedCapacity > 0 && (
                      <div className="pt-1" aria-hidden="true">
                        <div className="h-1.5 w-full rounded-full bg-marrom-madeira/30 overflow-hidden">
                          <div
                            className={
                              formData.people > totalSelectedCapacity
                                ? 'h-full rounded-full bg-vermelho-brasa transition-all duration-300'
                                : 'h-full rounded-full bg-gradient-to-r from-laranja-fogo to-ambar-premium transition-all duration-300'
                            }
                            style={{ width: `${Math.min(100, Math.round((formData.people / totalSelectedCapacity) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-creme-gastronomico/40 mt-1">
                          {Math.min(formData.people, totalSelectedCapacity)} de {totalSelectedCapacity} lugares das mesas selecionadas
                        </p>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp redirect for large parties (>8 people) */}
                  {isLargeParty && (
                    <div className="bg-ambar-premium/10 border border-ambar-premium/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
                      <div className="flex items-start gap-2.5">
                        <MessageCircle className="w-5 h-5 text-verde-oliva mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-bold text-creme-gastronomico text-sm">Reserva Personalizada para Grupos</h4>
                          <p className="text-creme-gastronomico/70 text-xs mt-0.5">
                            Para grupos acima de {maxParty} pessoas, oferecemos atendimento personalizado via WhatsApp para acomodar seu grupo com o melhor conforto.
                          </p>
                        </div>
                      </div>

                      {!whatsappAvailable ? (
                        <p className="text-xs text-creme-gastronomico/50">Contato por WhatsApp temporariamente indisponível. Tente novamente mais tarde.</p>
                      ) : whatsappUrl ? (
                        <div className="space-y-2">
                          <div className="bg-preto-carvao/60 border border-marrom-madeira/30 rounded-lg px-3 py-1.5 text-center">
                            <span className="text-[10px] text-creme-gastronomico/60 block">Código da Solicitação</span>
                            <span className="text-base font-bold text-ambar-premium font-mono tracking-wider">{leadCode}</span>
                          </div>
                          <Button
                            type="button"
                            variant="premium"
                            className="w-full h-12 text-sm font-bold bg-[#25D366] hover:bg-[#22c55e] text-white shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                            onClick={() => window.open(whatsappUrl, '_blank')}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Falar no WhatsApp
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="premium"
                          className="w-full h-11 text-xs font-bold bg-[#25D366] hover:bg-[#22c55e] text-white"
                          onClick={handleWhatsAppLargeParty}
                          disabled={isCreatingLead}
                        >
                          {isCreatingLead ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Preparando...
                            </span>
                          ) : (
                            <><MessageCircle className="w-4 h-4 mr-1.5" /> Solicitar Reserva via WhatsApp</>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="bg-vermelho-brasa/10 border border-vermelho-brasa/50 text-vermelho-brasa text-sm p-3 rounded-lg flex items-start gap-2 shadow-sm">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {!isLargeParty && (
                    <Button
                      type="submit"
                      variant="premium"
                      className="w-full h-13 text-base font-bold tracking-wide mt-2 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> Confirmando Reserva...
                        </span>
                      ) : authUser || mockMode ? 'Confirmar Reserva'
                        : authMode === 'login' ? 'Entrar e Reservar'
                        : 'Criar Conta e Reservar'}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-8 border-dashed border-marrom-madeira/50 bg-preto-carvao/20 shadow-inner">
              <div className="w-20 h-20 rounded-full bg-marrom-madeira/10 flex items-center justify-center mb-6 border border-marrom-madeira/20">
                <MapPin className="w-10 h-10 text-marrom-madeira/60" />
              </div>
              <h3 className="text-2xl font-bold text-creme-gastronomico mb-3">Selecione uma mesa</h3>
              <p className="text-creme-gastronomico/60 text-sm max-w-[260px] leading-relaxed">
                Navegue pelo mapa do salão ao lado e clique na mesa desejada (ou até 2 mesas combinadas) para ver os detalhes e garantir sua reserva.
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
