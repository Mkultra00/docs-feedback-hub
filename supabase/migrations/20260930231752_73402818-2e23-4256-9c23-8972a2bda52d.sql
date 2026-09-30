CREATE TABLE public.board_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('voice','text')),
  transcript text NOT NULL,
  summary text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  urgency text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high','medium','low')),
  borough text NOT NULL DEFAULT 'Unknown',
  agent_reply text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.board_messages TO anon, authenticated;
GRANT ALL ON public.board_messages TO service_role;
ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view the message board" ON public.board_messages FOR SELECT TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_messages;