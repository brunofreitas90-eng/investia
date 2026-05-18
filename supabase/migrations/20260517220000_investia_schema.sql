-- InvestIA Database Schema
-- Run in Supabase SQL Editor

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  financial_goal JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock_br', 'stock_us', 'fii', 'etf', 'bdr')),
  quantity DECIMAL(18, 8) NOT NULL,
  average_price DECIMAL(18, 8) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker, purchase_date)
);

-- Operations (buy/sell for IR)
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('buy', 'sell')),
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  total DECIMAL(18, 8) NOT NULL,
  fees DECIMAL(18, 8) DEFAULT 0,
  operation_date DATE NOT NULL,
  market TEXT DEFAULT 'B3' CHECK (market IN ('B3', 'NYSE', 'NASDAQ')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dividends tracking
CREATE TABLE IF NOT EXISTS dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  amount_per_share DECIMAL(18, 8),
  quantity DECIMAL(18, 8),
  com_date DATE,
  ex_date DATE,
  payment_date DATE,
  status TEXT DEFAULT 'expected' CHECK (status IN ('expected', 'confirmed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_type TEXT DEFAULT 'stock_br',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_target', 'dividend', 'com_date', 'payment', 'news', 'ir', 'gain', 'loss'
  )),
  condition JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_app BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax (IR) records
CREATE TABLE IF NOT EXISTS tax_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_sales DECIMAL(18, 8) DEFAULT 0,
  profit_loss DECIMAL(18, 8) DEFAULT 0,
  tax_due DECIMAL(18, 8) DEFAULT 0,
  darf_amount DECIMAL(18, 8) DEFAULT 0,
  is_exempt BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- Financial events calendar
CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'dividend_com', 'motion_ex', 'payment', 'earnings', 'assembly', 'split', 'other'
  )),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history cache
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(18, 8),
  high DECIMAL(18, 8),
  low DECIMAL(18, 8),
  close DECIMAL(18, 8) NOT NULL,
  volume BIGINT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- AI chat history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI company analyses cache
CREATE TABLE IF NOT EXISTS company_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  analysis JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- API cache
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_user ON operations(user_id);
CREATE INDEX IF NOT EXISTS idx_dividends_user ON dividends(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_user ON tax_records(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON financial_events(event_date);
CREATE INDEX IF NOT EXISTS idx_price_ticker ON price_history(ticker, date);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_cache_key ON api_cache(cache_key);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own portfolio" ON portfolio FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own operations" ON operations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own dividends" ON dividends FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tax" ON tax_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own chats" ON chat_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Public read for events and price history
ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events" ON financial_events FOR SELECT USING (true);
CREATE POLICY "Anyone can read prices" ON price_history FOR SELECT USING (true);
CREATE POLICY "Anyone can read analyses" ON company_analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can read cache" ON api_cache FOR SELECT USING (true);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER portfolio_updated_at BEFORE UPDATE ON portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
