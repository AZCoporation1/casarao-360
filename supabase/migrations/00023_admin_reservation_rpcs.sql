-- =============================================
-- Migration 00023: RPCs administrativos de confirmação/cancelamento
-- Central Casarão 360 — 2026-09-01
-- =============================================
-- CONTEXTO: o ADM confirmava/cancelava via UPDATE direto na tabela — sem
-- registro em reservation_status_history, sem audit_logs, e o CANCELAMENTO
-- NÃO liberava as allocations em reservation_tables. Como o índice único
-- parcial idx_rt_active_allocation impede duas allocations ativas na mesma
-- mesa, uma reserva cancelada deixava a mesa PRESA para sempre (bug real).
--
-- Estes RPCs concentram a transição de estado no banco, com:
--   * validação de papel via has_org_role (owner/admin/manager);
--   * lock FOR UPDATE + validação de transição;
--   * liberação das allocations no cancelamento;
--   * history (actor staff) + audit_logs;
--   * sync das mesas via trigger existente (sync_event_table_status).
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_confirm_reservation(p_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id FOR UPDATE;

  IF v_res IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Reserva não encontrada.');
  END IF;

  IF NOT has_org_role(v_res.organization_id, ARRAY['owner','admin','manager']::user_role[]) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized', 'message', 'Sem permissão para confirmar reservas.');
  END IF;

  IF v_res.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'message', 'Somente reservas pendentes podem ser confirmadas (status atual: ' || v_res.status || ').');
  END IF;

  UPDATE reservations
  SET status = 'confirmed', confirmed_at = now(), updated_at = now()
  WHERE id = p_reservation_id;

  INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason, actor_type, actor_id)
  VALUES (p_reservation_id, 'pending', 'confirmed', 'Confirmada manualmente pelo ADM', 'staff', auth.uid());

  INSERT INTO audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    v_res.organization_id, auth.uid(), 'reservation_confirmed', 'reservation', p_reservation_id,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'confirmed', 'reservation_code', v_res.reservation_code)
  );

  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'new_status', 'confirmed');
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_reservation(p_reservation_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_res RECORD;
  v_released integer;
BEGIN
  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id FOR UPDATE;

  IF v_res IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Reserva não encontrada.');
  END IF;

  IF NOT has_org_role(v_res.organization_id, ARRAY['owner','admin','manager']::user_role[]) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized', 'message', 'Sem permissão para cancelar reservas.');
  END IF;

  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'message', 'Somente reservas pendentes ou confirmadas podem ser canceladas (status atual: ' || v_res.status || ').');
  END IF;

  UPDATE reservations
  SET status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason, updated_at = now()
  WHERE id = p_reservation_id;

  -- Libera as allocations — sem isto a mesa fica presa pelo índice único
  UPDATE reservation_tables
  SET allocation_status = 'released', released_at = now()
  WHERE reservation_id = p_reservation_id AND allocation_status = 'active';
  GET DIAGNOSTICS v_released = ROW_COUNT;

  INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason, actor_type, actor_id)
  VALUES (p_reservation_id, v_res.status, 'cancelled', COALESCE(p_reason, 'Cancelada manualmente pelo ADM'), 'staff', auth.uid());

  INSERT INTO audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    v_res.organization_id, auth.uid(), 'reservation_cancelled', 'reservation', p_reservation_id,
    jsonb_build_object('status', v_res.status),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason, 'released_allocations', v_released, 'reservation_code', v_res.reservation_code)
  );

  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'new_status', 'cancelled', 'released_allocations', v_released);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_confirm_reservation(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_reservation(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_reservation(uuid, text) TO authenticated;
