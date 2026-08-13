import Groq from "groq-sdk";

const ALLOWED_ORIGIN = "https://jashwanthvaka.github.io";

const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers
  });
}

export async function POST(request) {
  try {
    const origin = request.headers.get("origin");

    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        {
          status: 403,
          headers
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Groq API key is not configured" }),
        {
          status: 500,
          headers
        }
      );
    }

    const body = await request.json();

    let messages;

    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (body.message) {
      messages = [
        {
          role: "system",
          content:
            "You are PHYLAB AI, an expert IBDP Physics tutor. Explain physics clearly, accurately, step by step, at IB Diploma Programme level."
        },
        {
          role: "user",
          content: body.message
        }
      ];
    } else {
      return new Response(
        JSON.stringify({ error: "No message provided" }),
        {
          status: 400,
          headers
        }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "No response received.";

    return new Response(
      JSON.stringify({
        reply,
        response: reply,
        provider: "groq"
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error("PHYLAB AI error:", error);

    return new Response(
      JSON.stringify({
        error: "PHYLAB AI request failed"
      }),
      {
        status: 500,
        headers
      }
    );
  }
}
