CREATE TABLE IF NOT EXISTS public.property_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  property_type TEXT NOT NULL,
  state TEXT NOT NULL,
  preferred_area TEXT NOT NULL,
  alternative_areas TEXT[],
  min_budget NUMERIC NOT NULL,
  max_budget NUMERIC NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  furnishing TEXT,
  move_in_timeline TEXT,
  features TEXT[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'searching', 'matched', 'inspection', 'completed', 'closed')),
  assigned_to UUID,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.property_requests(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'suggested',
  match_score INTEGER,
  match_notes TEXT,
  shared_with_customer_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_request_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_requests_select_own"
  ON public.property_requests FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "property_requests_insert_own"
  ON public.property_requests FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "property_requests_update_own_submitted_or_reviewing"
  ON public.property_requests FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
    AND status IN ('submitted', 'reviewing')
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
    AND tenant_id = OLD.tenant_id
    AND assigned_to IS NULL
    AND priority = OLD.priority
  );

CREATE POLICY "property_requests_admin_manage"
  ON public.property_requests FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "property_request_matches_select_own"
  ON public.property_request_matches FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.property_requests WHERE tenant_id IN (
        SELECT id FROM public.tenants WHERE user_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "property_request_matches_admin_manage"
  ON public.property_request_matches FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.update_property_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_requests_updated_at_trigger ON public.property_requests;
CREATE TRIGGER property_requests_updated_at_trigger
BEFORE UPDATE ON public.property_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_property_requests_updated_at();
