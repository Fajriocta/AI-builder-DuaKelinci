export async function sendTelegram(text: string, token: string, chatId: string): Promise<void> {
  const t = token.trim();
  if (!/^\d+:[\w-]+$/.test(t)) throw new Error("Format bot token tidak valid (contoh: 123456:ABC-xyz).");
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId.trim(), text }),
    });
  } catch {
    throw new Error("Tidak bisa menghubungi Telegram. Periksa koneksi internet.");
  }
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) {
    const d = body.description ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("Bot token tidak valid.");
    if (/chat not found/i.test(d)) throw new Error("Chat ID tidak ditemukan. Pastikan bot sudah ditambahkan ke grup/chat.");
    throw new Error(d);
  }
}
