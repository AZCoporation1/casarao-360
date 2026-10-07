// =============================================
// Database Types — Central Casarão 360
// Generated from migration schema
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum types matching the SQL enums
export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';
export type EventStatus = 'draft' | 'scheduled' | 'open' | 'sold_out' | 'completed' | 'cancelled';
export type TableStatus = 'free' | 'reserved' | 'occupied' | 'blocked' | 'pending' | 'waitlist';
export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'cancelled' | 'no_show' | 'expired';
export type WaitlistStatus = 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type InsightImpact = 'low' | 'medium' | 'high' | 'critical';
export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';
export type InventoryUnit = 'unit' | 'kg' | 'g' | 'l' | 'ml' | 'box' | 'pack';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string | null;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          capacity?: number | null;
          updated_at?: string;
        };
      };
      venue_sectors: {
        Row: {
          id: string;
          venue_id: string;
          name: string;
          description: string | null;
          type: string | null;
          color: string | null;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          name: string;
          description?: string | null;
          type?: string | null;
          color?: string | null;
          sort_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          type?: string | null;
          color?: string | null;
          sort_order?: number | null;
          updated_at?: string;
        };
      };
      venue_tables: {
        Row: {
          id: string;
          venue_id: string;
          sector_id: string | null;
          code: string;
          label: string | null;
          capacity: number;
          x: number;
          y: number;
          width: number | null;
          height: number | null;
          shape: string | null;
          rotation: number | null;
          default_status: TableStatus | null;
          features: string[];
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          sector_id?: string | null;
          code: string;
          label?: string | null;
          capacity: number;
          x: number;
          y: number;
          width?: number | null;
          height?: number | null;
          shape?: string | null;
          rotation?: number | null;
          default_status?: TableStatus | null;
          features?: string[];
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          label?: string | null;
          capacity?: number;
          x?: number;
          y?: number;
          width?: number | null;
          height?: number | null;
          shape?: string | null;
          rotation?: number | null;
          default_status?: TableStatus | null;
          features?: string[];
          is_active?: boolean | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          venue_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          artist_name: string | null;
          event_date: string;
          starts_at: string;
          ends_at: string | null;
          status: EventStatus | null;
          cover_image_url: string | null;
          capacity_override: number | null;
          reservation_opens_at: string | null;
          reservation_closes_at: string | null;
          public_visibility: boolean | null;
          highlights: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          venue_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          artist_name?: string | null;
          event_date: string;
          starts_at: string;
          ends_at?: string | null;
          status?: EventStatus | null;
          cover_image_url?: string | null;
          capacity_override?: number | null;
          reservation_opens_at?: string | null;
          reservation_closes_at?: string | null;
          public_visibility?: boolean | null;
          highlights?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string | null;
          artist_name?: string | null;
          event_date?: string;
          starts_at?: string;
          ends_at?: string | null;
          status?: EventStatus | null;
          cover_image_url?: string | null;
          capacity_override?: number | null;
          reservation_opens_at?: string | null;
          reservation_closes_at?: string | null;
          public_visibility?: boolean | null;
          highlights?: string[];
          updated_at?: string;
        };
      };
      event_tables: {
        Row: {
          id: string;
          event_id: string;
          venue_table_id: string;
          status: TableStatus | null;
          capacity_override: number | null;
          price_cents: number | null;
          experience_label: string | null;
          experience_description: string | null;
          features: string[];
          blocked_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          venue_table_id: string;
          status?: TableStatus | null;
          capacity_override?: number | null;
          price_cents?: number | null;
          experience_label?: string | null;
          experience_description?: string | null;
          features?: string[];
          blocked_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: TableStatus | null;
          capacity_override?: number | null;
          price_cents?: number | null;
          experience_label?: string | null;
          experience_description?: string | null;
          features?: string[];
          blocked_reason?: string | null;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          phone: string;
          normalized_phone: string;
          email: string | null;
          cpf_last4: string | null;
          cpf_hash: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          phone: string;
          normalized_phone: string;
          email?: string | null;
          cpf_last4?: string | null;
          cpf_hash?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          normalized_phone?: string;
          email?: string | null;
          cpf_last4?: string | null;
          cpf_hash?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string;
          event_table_id: string;
          customer_id: string;
          reservation_code: string;
          status: ReservationStatus | null;
          party_size: number;
          customer_name_snapshot: string | null;
          customer_phone_snapshot: string | null;
          notes: string | null;
          source: string | null;
          payment_status: PaymentStatus | null;
          expires_at: string | null;
          confirmed_at: string | null;
          checked_in_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id: string;
          event_table_id: string;
          customer_id: string;
          reservation_code: string;
          status?: ReservationStatus | null;
          party_size: number;
          customer_name_snapshot?: string | null;
          customer_phone_snapshot?: string | null;
          notes?: string | null;
          source?: string | null;
          payment_status?: PaymentStatus | null;
          expires_at?: string | null;
          confirmed_at?: string | null;
          checked_in_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ReservationStatus | null;
          party_size?: number;
          notes?: string | null;
          payment_status?: PaymentStatus | null;
          expires_at?: string | null;
          confirmed_at?: string | null;
          checked_in_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      waitlist_entries: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string;
          customer_id: string;
          party_size: number;
          preferred_sector_id: string | null;
          status: WaitlistStatus | null;
          priority: number;
          notes: string | null;
          notified_at: string | null;
          expires_at: string | null;
          converted_reservation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id: string;
          customer_id: string;
          party_size: number;
          preferred_sector_id?: string | null;
          status?: WaitlistStatus | null;
          priority: number;
          notes?: string | null;
          notified_at?: string | null;
          expires_at?: string | null;
          converted_reservation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: WaitlistStatus | null;
          priority?: number;
          notes?: string | null;
          notified_at?: string | null;
          expires_at?: string | null;
          converted_reservation_id?: string | null;
          updated_at?: string;
        };
      };
      operational_alerts: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string | null;
          title: string;
          description: string | null;
          severity: AlertSeverity | null;
          source: string | null;
          recommendation: string | null;
          is_resolved: boolean | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id?: string | null;
          title: string;
          description?: string | null;
          severity?: AlertSeverity | null;
          source?: string | null;
          recommendation?: string | null;
          is_resolved?: boolean | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          severity?: AlertSeverity | null;
          recommendation?: string | null;
          is_resolved?: boolean | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
      };
      ai_insights: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string | null;
          title: string;
          description: string;
          impact: InsightImpact | null;
          source: string | null;
          recommendation: string | null;
          metadata: Json | null;
          is_resolved: boolean | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id?: string | null;
          title: string;
          description: string;
          impact?: InsightImpact | null;
          source?: string | null;
          recommendation?: string | null;
          metadata?: Json | null;
          is_resolved?: boolean | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          impact?: InsightImpact | null;
          recommendation?: string | null;
          metadata?: Json | null;
          is_resolved?: boolean | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
      };
      inventory_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string | null;
          name: string;
          unit: InventoryUnit;
          current_quantity: number | null;
          minimum_quantity: number | null;
          is_critical: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id?: string | null;
          name: string;
          unit: InventoryUnit;
          current_quantity?: number | null;
          minimum_quantity?: number | null;
          is_critical?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          unit?: InventoryUnit;
          current_quantity?: number | null;
          minimum_quantity?: number | null;
          is_critical?: boolean | null;
          updated_at?: string;
        };
      };
      event_inventory_forecasts: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string;
          inventory_item_id: string;
          recommended_quantity: number | null;
          estimated_consumption: number | null;
          alert_level: AlertSeverity | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id: string;
          inventory_item_id: string;
          recommended_quantity?: number | null;
          estimated_consumption?: number | null;
          alert_level?: AlertSeverity | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          recommended_quantity?: number | null;
          estimated_consumption?: number | null;
          alert_level?: AlertSeverity | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      staff_assignments: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string;
          staff_name: string;
          role: string;
          shift_start: string | null;
          shift_end: string | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id: string;
          staff_name: string;
          role: string;
          shift_start?: string | null;
          shift_end?: string | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          staff_name?: string;
          role?: string;
          shift_start?: string | null;
          shift_end?: string | null;
          status?: string | null;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_profile_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_profile_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      get_event_metrics: {
        Args: { p_event_id: string };
        Returns: Json;
      };
      get_executive_summary: {
        Args: { p_organization_id: string };
        Returns: Json;
      };
      create_public_reservation: {
        Args: {
          p_event_id: string;
          p_event_table_id: string;
          p_full_name: string;
          p_phone: string;
          p_cpf: string;
          p_party_size: number;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      add_to_waitlist: {
        Args: {
          p_event_id: string;
          p_full_name: string;
          p_phone: string;
          p_cpf: string;
          p_party_size: number;
          p_preferred_sector_id?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      move_waitlist_to_reservation: {
        Args: {
          p_waitlist_entry_id: string;
          p_event_table_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      table_status: TableStatus;
      reservation_status: ReservationStatus;
      waitlist_status: WaitlistStatus;
      alert_severity: AlertSeverity;
      insight_impact: InsightImpact;
      payment_status: PaymentStatus;
      inventory_unit: InventoryUnit;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
