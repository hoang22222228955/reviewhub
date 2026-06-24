const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://reviewhub-backend-ki8w.onrender.com";

export async function askAIAdvisor(message) {
  const res = await fetch(`${API_BASE_URL}/api/ai/advisor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error("KhÃ´ng gá»i Ä‘Æ°á»£c AI tÆ° váº¥n");
  }

  return await res.json();
}
