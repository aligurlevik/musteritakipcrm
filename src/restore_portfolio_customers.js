// Customer data is authoritative in D1. Never replay historical customer lists.
// Retain the compatibility hook for existing read routes, without writing any data.
export async function restorePortfolioCustomers(env){
  return {ok:true,verified:true,restored:false};
}
