-- =============================================
-- Migration 00013: Reservation Expiration Cron
-- Central Casarão 360
-- =============================================

-- 1. Configuração de Hold na Organização
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'reservation_hold_minutes'
  ) THEN
    ALTER TABLE organizations ADD COLUMN reservation_hold_minutes integer DEFAULT 20;
  END IF;
END $$;

-- 2. Coluna expires_at em reservations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- 3. Atualizar registros existentes para ter expires_at baseado no created_at se for pending
UPDATE reservations
SET expires_at = created_at + interval '20 minutes'
WHERE status = 'pending' AND expires_at IS NULL;

-- 4. Função para expirar reservas
CREATE OR REPLACE FUNCTION expire_pending_reservations()
RETURNS void AS $$
DECLARE
  v_expired_count integer;
BEGIN
  -- Cancel reservations that have passed their expires_at
  WITH expired AS (
    UPDATE reservations r
    SET 
      status = 'cancelled',
      updated_at = now()
    WHERE r.status = 'pending'
      AND r.expires_at <= now()
    RETURNING r.id, r.event_table_id
  ),
  freed_tables AS (
    UPDATE event_tables et
    SET 
      status = 'free',
      updated_at = now()
    FROM expired e
    WHERE et.id = e.event_table_id
    RETURNING et.id
  )
  SELECT count(*) INTO v_expired_count FROM expired;
  
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expiradas % reservas pendentes', v_expired_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para auto-calcular expires_at na inserção/atualização para pending
CREATE OR REPLACE FUNCTION set_reservation_expires_at()
RETURNS TRIGGER AS $$
DECLARE
  v_hold_minutes integer;
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS DISTINCT FROM 'pending' OR OLD IS NULL) THEN
    SELECT COALESCE(reservation_hold_minutes, 20) INTO v_hold_minutes
    FROM organizations WHERE id = NEW.organization_id;
    
    NEW.expires_at := now() + (v_hold_minutes || ' minutes')::interval;
  ELSIF NEW.status != 'pending' THEN
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reservation_expires_at ON reservations;
CREATE TRIGGER trg_set_reservation_expires_at
  BEFORE INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_reservation_expires_at();

-- 6. Ativar pg_cron (caso ainda não esteja ativado) e agendar job
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Tentar desativar se existir para não duplicar
  PERFORM cron.unschedule('expire-pending-reservations');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore
END $$;

-- Agendar para rodar a cada 5 minutos
SELECT cron.schedule(
  'expire-pending-reservations',
  '*/5 * * * *',
  $$ SELECT expire_pending_reservations(); $$
);
