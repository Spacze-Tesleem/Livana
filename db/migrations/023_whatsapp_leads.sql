CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  enquiry_type TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  purpose TEXT,
  property_type TEXT,
  preferred_location TEXT,
  min_budget NUMERIC,
  max_budget NUMERIC,
  bedrooms INTEGER,
  details JSONB,
  message TEXT,
  source_page TEXT,
  reference_code TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS whatsapp_leads_created_at_idx
  ON public.whatsapp_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_leads_reference_code_idx
  ON public.whatsapp_leads (reference_code);

CREATE POLICY "whatsapp_leads_select_own_or_admin"
  ON public.whatsapp_leads FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "whatsapp_leads_insert_anyone"
  ON public.whatsapp_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "whatsapp_leads_update_admin_only"
  ON public.whatsapp_leads FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "whatsapp_leads_delete_admin_only"
  ON public.whatsapp_leads FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.update_whatsapp_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_leads_updated_at_trigger ON public.whatsapp_leads;
CREATE TRIGGER whatsapp_leads_updated_at_trigger
BEFORE UPDATE ON public.whatsapp_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_leads_updated_at();
