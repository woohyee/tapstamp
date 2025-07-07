-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    stamps INTEGER DEFAULT 0,
    vip_status BOOLEAN DEFAULT FALSE,
    vip_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stamps table
CREATE TABLE stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('discount_10', 'discount_20', 'event_reward')),
    value INTEGER NOT NULL, -- percentage or amount
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lottery', 'ladder')),
    result TEXT NOT NULL,
    reward_coupon_id UUID REFERENCES coupons(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_stamps_customer_id ON stamps(customer_id);
CREATE INDEX idx_coupons_customer_id ON coupons(customer_id);
CREATE INDEX idx_events_customer_id ON events(customer_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role
CREATE POLICY "Service role can do everything" ON customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON stamps FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON coupons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON events FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous access (for NFC functionality)
CREATE POLICY "Anonymous can read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Anonymous can insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anonymous can update customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Anonymous can insert stamps" ON stamps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anonymous can read stamps" ON stamps FOR SELECT USING (true);
CREATE POLICY "Anonymous can read coupons" ON coupons FOR SELECT USING (true);
CREATE POLICY "Anonymous can update coupons" ON coupons FOR UPDATE USING (true);
CREATE POLICY "Anonymous can insert coupons" ON coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anonymous can insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anonymous can read events" ON events FOR SELECT USING (true);