const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function askAIAdvisor(message) {
  const res = await fetch(`${API_BASE_URL}/api/ai/advisor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error("Không gọi được AI tư vấn");
  }

  return await res.json();
}