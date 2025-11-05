import pool from "config/db";

async function getPoolsByWallet(ownerAddress: string) {
  const query = `
    SELECT
      p.id AS pool_id,
      p.pool_address,
      p.token_base,
      p.token_quote,
      p.token_base_decimal,
      p.token_quote_decimal,
      p.trade_fee,
      p.base_reserve,
      p.quote_reserve,
      pos.id AS position_id,
      pos.position_address,
      pos.lower_bin_id,
      pos.upper_bin_id,
      pos.liquidity_shape,
      pos.liquidity_shares,
      pos.liquidity_amount,
      pos.token_base_amount,
      pos.token_quote_amount,
      pos.is_active,
      w.id AS wallet_id,
      w.owner_address,
      w.nickname
    FROM position pos
    JOIN pools p ON pos.pool_id = p.id
    JOIN wallets w ON pos.wallet_id = w.id
    WHERE w.owner_address = $1
    ORDER BY p.created_at DESC;
  `;

  const result = await pool.query(query, [ownerAddress]);
  return result.rows;
}

// Example usage
(async () => {
  const walletAddress = "5ufkqiemfB2TrJ7pVXEaGjGP9ArXdCNgbsccLLrSvqZA";
  const pools = await getPoolsByWallet(walletAddress);

  console.log("📊 Pools for wallet:", walletAddress);
  console.table(pools);

  await pool.end();
})();