// Edu-Orb AI Doubt-Solving Chatbot — serverless function
// Runs on Netlify's servers, NOT in the browser — so the API key stays secret.
// The key is read from an environment variable you set in Netlify (never written in this file).

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server is missing GEMINI_API_KEY. Add it in Netlify → Site settings → Environment variables." })
    };
  }

  let question;
  try {
    const body = JSON.parse(event.body || "{}");
    question = (body.question || "").toString().trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: "Please send a question." }) };
  }
  if (question.length > 1500) {
    return { statusCode: 400, body: JSON.stringify({ error: "Question is too long. Please shorten it." }) };
  }

  const systemInstruction =
    "You are the Edu-Orb Study Helper, a friendly doubt-solving assistant for Maharashtra State Board students " +
    "in Classes 8 to 12. Explain concepts clearly and simply, step by step, the way a good tutor would. " +
    "Keep answers focused on the student's syllabus level — don't overcomplicate. " +
    "If a question is not related to studies/school subjects, politely say you can only help with study doubts.";

  try {
    const model = "gemini-2.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: question }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: data.error?.message || "AI service error. Try again in a moment." })
      };
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate an answer for that. Try rephrasing your question.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong. Please try again." })
    };
  }
};
