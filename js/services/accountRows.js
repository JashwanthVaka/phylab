/** Paginate past Supabase's default 1,000-row response limit. RLS still applies. */
export async function accountRows(db, table, userId, columns = '*') {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select(columns).eq('user_id', userId)
      .order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 499);
    if (error) throw new Error(error.message || 'Account data could not be loaded.');
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
