
-- ENUM for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student');

-- BRANCHES
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.branches (name) VALUES ('CSE'),('ECE'),('EEE'),('MECH'),('CIVIL'),('IT');

-- PROFILES (1:1 with auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  mobile TEXT,
  branch TEXT,
  year INT,
  role_hint TEXT,
  profile_pic_url TEXT,
  father_mobile TEXT,
  mother_mobile TEXT,
  city TEXT,
  jvd BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES (separate table — security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- FEES
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  subject TEXT,
  period INT,
  status TEXT NOT NULL CHECK (status IN ('P','A')),
  branch TEXT,
  year INT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX idx_attendance_branch_year_date ON public.attendance(branch, year, date);

-- CHAT
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_chat_pair ON public.chat_messages(sender_id, recipient_id, created_at);

-- SECURITY DEFINER role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Get current user's branch (for faculty visibility)
CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch FROM public.profiles WHERE id = auth.uid()
$$;

-- Trigger: auto-create profile + assign role on signup
-- First signup => admin; subsequent => role from metadata or 'student' default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
  chosen_role app_role;
  meta_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  meta_role := NEW.raw_user_meta_data->>'role';

  IF user_count = 0 THEN
    chosen_role := 'admin';
  ELSIF meta_role = 'faculty' THEN
    chosen_role := 'faculty';
  ELSIF meta_role = 'admin' THEN
    chosen_role := 'admin';
  ELSE
    chosen_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, branch, year, role_hint)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'branch',
    NULLIF(NEW.raw_user_meta_data->>'year','')::INT,
    chosen_role::TEXT
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER fees_touch BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- BRANCHES: anyone authenticated can read, only admin writes
CREATE POLICY "branches read" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches admin write" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PROFILES
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- USER_ROLES
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FEES
CREATE POLICY "fees student read own" ON public.fees FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "fees admin write" ON public.fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ATTENDANCE
CREATE POLICY "attendance student read own" ON public.attendance FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'faculty') AND branch = public.current_user_branch())
  );
CREATE POLICY "attendance faculty insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "attendance admin update" ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR marked_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR marked_by = auth.uid());
CREATE POLICY "attendance admin delete" ON public.attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- CHAT
CREATE POLICY "chat read participant" ON public.chat_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "chat send self" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "chat update participant" ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Storage: avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
