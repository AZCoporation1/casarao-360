"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, MessageCircle, Phone, Users, Calendar, Handshake, Check, X, Archive, Clock } from 'lucide-react';

interface Lead {
  id: string;
  public_code: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  sector_interest: string;
  status: string;
  created_at: string;
  event: {
    title: string;
    event_date: string;
  } | null;
}

const statusColors: Record<string, string> = {
  new: 'border-laranja-fogo text-laranja-fogo',
  contacted: 'border-ambar-premium text-ambar-premium',
  negotiating: 'border-blue-400 text-blue-400',
  converted: 'border-verde-oliva text-verde-oliva',
  lost: 'border-vermelho-brasa text-vermelho-brasa',
  archived: 'border-gray-500 text-gray-500',
};

const statusLabels: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  negotiating: 'Negociando',
  converted: 'Convertido',
  lost: 'Perdido',
  archived: 'Arquivado',
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('large_party_requests')
        .select(`
          id, public_code, customer_name, customer_phone, party_size, 
          sector_interest, status, created_at,
          events ( title, event_date )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Lead[] = (data || []).map((r: any) => ({
        id: r.id,
        public_code: r.public_code,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        party_size: r.party_size,
        sector_interest: r.sector_interest,
        status: r.status || 'new',
        created_at: r.created_at,
        event: r.events ? {
          title: r.events.title,
          event_date: r.events.event_date
        } : null
      }));

      setLeads(mapped);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setIsActing(id);
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseBrowserClient();
      
      const { error } = await supabase
        .from('large_party_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (!error) await loadLeads();
    } catch (err) {
      console.error('Error changing status', err);
    } finally {
      setIsActing(null);
    }
  };

  const filteredLeads = leads.filter(lead => statusFilter === 'all' || lead.status === statusFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Reservas Personalizadas</h1>
          <p className="text-creme-gastronomico/70 mt-1">
            Solicitações de grupos especiais via WhatsApp — dados em tempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={loadLeads} className="text-xs shrink-0 self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>

          <div className="bg-preto-carvao/80 border border-marrom-madeira/50 rounded-lg p-2 w-full sm:w-auto flex items-center gap-2">
            <select
              className="bg-transparent text-creme-gastronomico font-bold text-sm outline-none cursor-pointer p-1"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all" className="bg-preto-carvao text-creme-gastronomico">Todos os Status</option>
              <option value="new" className="bg-preto-carvao text-creme-gastronomico">Novo</option>
              <option value="contacted" className="bg-preto-carvao text-creme-gastronomico">Contatado</option>
              <option value="negotiating" className="bg-preto-carvao text-creme-gastronomico">Negociando</option>
              <option value="converted" className="bg-preto-carvao text-creme-gastronomico">Convertido</option>
              <option value="lost" className="bg-preto-carvao text-creme-gastronomico">Perdido</option>
              <option value="archived" className="bg-preto-carvao text-creme-gastronomico">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-creme-gastronomico py-12 justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-laranja-fogo" />
          <span>Carregando leads...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLeads.length === 0 ? (
            <div className="text-creme-gastronomico/50 p-8 border border-dashed border-marrom-madeira/50 rounded-lg text-center bg-preto-carvao/40">
              Nenhuma solicitação encontrada para o filtro selecionado.
            </div>
          ) : (
            filteredLeads.map(lead => (
              <Card key={lead.id} className="bg-preto-carvao/80 border-marrom-madeira/30 hover:border-marrom-madeira/60 transition-colors">
                <CardContent className="p-4 md:p-5 flex flex-col lg:flex-row gap-6">
                  
                  {/* Lead Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-creme-gastronomico text-xl">{lead.customer_name}</h3>
                          <Badge variant="outline" className={`border ${statusColors[lead.status] || 'border-creme-gastronomico text-creme-gastronomico'}`}>
                            {statusLabels[lead.status] || lead.status}
                          </Badge>
                        </div>
                        <p className="text-creme-gastronomico/70 flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5" />
                          {lead.customer_phone}
                        </p>
                      </div>
                      {lead.public_code && (
                        <div className="text-right">
                          <Badge variant="outline" className="border-ambar-premium/50 text-ambar-premium font-mono">
                            {lead.public_code}
                          </Badge>
                          <p className="text-xs text-creme-gastronomico/40 mt-1">
                            {new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80 py-1">
                        <Users className="w-3.5 h-3.5 mr-1.5" /> {lead.party_size} pessoas
                      </Badge>
                      <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80 py-1">
                        Setor: {lead.sector_interest}
                      </Badge>
                      {lead.event && (
                        <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80 py-1 bg-marrom-madeira/10">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-ambar-premium" />
                          {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(lead.event.event_date + 'T12:00:00'))} - {lead.event.title}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col justify-center gap-2 lg:border-l lg:border-marrom-madeira/30 lg:pl-6 min-w-[200px]">
                    {lead.status === 'new' && (
                      <Button variant="outline" size="sm" className="w-full border-ambar-premium text-ambar-premium hover:bg-ambar-premium/10"
                        onClick={() => handleStatusChange(lead.id, 'contacted')} disabled={isActing === lead.id}>
                        {isActing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <MessageCircle className="w-3.5 h-3.5 mr-2" />} Contatar
                      </Button>
                    )}
                    
                    {(lead.status === 'new' || lead.status === 'contacted') && (
                      <Button variant="outline" size="sm" className="w-full border-blue-400 text-blue-400 hover:bg-blue-400/10"
                        onClick={() => handleStatusChange(lead.id, 'negotiating')} disabled={isActing === lead.id}>
                        {isActing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Handshake className="w-3.5 h-3.5 mr-2" />} Negociando
                      </Button>
                    )}

                    {(lead.status === 'contacted' || lead.status === 'negotiating') && (
                      <Button variant="outline" size="sm" className="w-full border-verde-oliva text-verde-oliva hover:bg-verde-oliva/10"
                        onClick={() => handleStatusChange(lead.id, 'converted')} disabled={isActing === lead.id}>
                        {isActing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Check className="w-3.5 h-3.5 mr-2" />} Converter
                      </Button>
                    )}

                    {(lead.status === 'contacted' || lead.status === 'negotiating') && (
                      <Button variant="outline" size="sm" className="w-full border-vermelho-brasa text-vermelho-brasa hover:bg-vermelho-brasa/10"
                        onClick={() => handleStatusChange(lead.id, 'lost')} disabled={isActing === lead.id}>
                        {isActing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <X className="w-3.5 h-3.5 mr-2" />} Perdido
                      </Button>
                    )}

                    {lead.status !== 'archived' && (
                      <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white"
                        onClick={() => handleStatusChange(lead.id, 'archived')} disabled={isActing === lead.id}>
                        {isActing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Archive className="w-3.5 h-3.5 mr-2" />} Arquivar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
