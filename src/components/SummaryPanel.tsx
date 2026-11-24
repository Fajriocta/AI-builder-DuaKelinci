import { useEffect, useState } from "react";
import { TELEGRAM_LIMIT } from "../lib/summary";
import { sendTelegram } from "../lib/telegram";
import { Card, Icon } from "./ui";

interface Props {
  generated: string;
  scope: string;
  notify: (text: string, error?: boolean) => void;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function SummaryPanel({ generated, scope, notify }: Props) {
  const [text, setText] = useState(generated);
  const [editing, setEditing] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [token, setToken] = useState<string>(import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "");
  const [chatId, setChatId] = useState<string>(import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "");
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  useEffect(() => { setText(generated); setEditing(false); setStatus({ kind: "idle" }); }, [generated]);

  const edited = text !== generated;
  const over = text.length > TELEGRAM_LIMIT;
  const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    setStatus({ kind: "sending" });
    try {
      await sendTelegram(text, token, chatId);
      setStatus({ kind: "ok", msg: "Terkirim ke Telegram." });
      notify("Ringkasan terkirim ke Telegram");
    } catch (e) {
      setStatus({ kind: "err", msg: (e as Error).message });
    }
  };

  return (
    <Card className="summary-card" title="Ringkasan untuk Telegram" sub={<>Mengikuti filter: <b>{scope}</b></>}>
      {editing ? (
        <textarea className="summary-edit" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit ringkasan" autoFocus />
      ) : (
        <div className="tg-chat" aria-label="Pratinjau pesan Telegram">
          <div className="tg-head">
            <span className="tg-avatar">DK</span>
            <span className="tg-headtxt"><b>Sales Manager Group</b><span className="muted">pratinjau</span></span>
          </div>
          <div className="tg-bubble">
            {text}
            <div className="tg-time">{now} ✓✓</div>
          </div>
        </div>
      )}

      <div className="row between" style={{ marginTop: 8 }}>
        <span className={`counter ${over ? "over" : ""}`}>
          {text.length.toLocaleString("id-ID")} / {TELEGRAM_LIMIT.toLocaleString("id-ID")} karakter{edited && " · diedit"}
        </span>
        {edited && <button className="link-btn" onClick={() => setText(generated)}>Kembalikan otomatis</button>}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary block" onClick={async () => { await copyText(text); notify("Ringkasan disalin, tinggal paste di Telegram"); }}>
          <Icon name="copy" /> Salin
        </button>
        <button className="btn icon-btn" onClick={() => setEditing(!editing)} aria-pressed={editing} title={editing ? "Selesai edit" : "Edit teks"} aria-label={editing ? "Selesai edit" : "Edit teks"}>
          <Icon name={editing ? "check" : "edit"} />
        </button>
        <button className="btn" onClick={() => setSendOpen(!sendOpen)} aria-expanded={sendOpen}>
          <Icon name="send" /> Kirim
        </button>
      </div>

      {sendOpen && (
        <form className="sendbox" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div className="hint">Kirim langsung lewat bot Telegram. Token hanya disimpan di halaman ini dan tidak dikirim ke mana pun selain Telegram.</div>
          <label className="field">Bot token
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456:ABC-xyz" autoComplete="off" />
          </label>
          <label className="field">Chat ID
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" inputMode="numeric" />
          </label>
          <button className="btn tg" type="submit" disabled={!token || !chatId || over || status.kind === "sending" || !text.trim()}>
            <Icon name="send" /> {status.kind === "sending" ? "Mengirim…" : "Kirim ke Telegram"}
          </button>
          {status.kind === "ok" && <div className="notice ok">{status.msg}</div>}
          {status.kind === "err" && <div className="notice err">{status.msg}</div>}
        </form>
      )}

      <p className="hint" style={{ margin: "14px 0 0" }}>
        Disusun langsung dari angka (tanpa AI), jadi setiap angka pasti cocok dengan dashboard.
      </p>
    </Card>
  );
}
