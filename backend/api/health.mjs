const ALLOWED_ORIGIN = "https://jashwanthvaka.github.io";

const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers
  });
}

export function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      tutorConfigured: Boolean(process.env.GROQ_API_KEY),
      providers: process.env.GROQ_API_KEY ? ["groq"] : []
    }),
    {
      status: 200,
      headers
    }
  );
}
