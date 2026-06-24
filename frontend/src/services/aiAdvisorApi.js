export async function askAIAdvisor(message) {
  const res = await fetch("http://localhost:8080/api/ai/advisor", {
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