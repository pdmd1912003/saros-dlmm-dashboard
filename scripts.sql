CREATE TABLE IF NOT EXISTS pools (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR(64) NOT NULL UNIQUE,
    metadata JSONB,
    token_base VARCHAR(128),
    token_quote VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_positions (
    wallet VARCHAR(64) PRIMARY KEY,
    positions JSONB,
    fetched_at TIMESTAMP DEFAULT NOW()
);