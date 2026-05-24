-- Enable Row Level Security on all public tables
-- This blocks direct PostgREST/Supabase API access (no policies = deny all)
-- Prisma uses the postgres role which bypasses RLS and is unaffected

ALTER TABLE public."User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Group"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GroupMember"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Assignment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReviewAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Review"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Text"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations  ENABLE ROW LEVEL SECURITY;
