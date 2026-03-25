import "./styles.css";

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
};

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app element");
}

const logoSrc = `${import.meta.env.BASE_URL}OpenWebBrowserLogo.png`;

root.innerHTML = `
  <main class="app">
    <header class="header">
      <div class="brand">
        <div class="logo-wrap">
          <img src="${logoSrc}" alt="OpenWebBrowser logo" class="logo" />
        </div>
        <div class="brand-text">
          <h1>OpenWebBrowser</h1>
          <p>LLM chat powered by Gemini</p>
        </div>
      </div>
      <div class="status" id="status"></div>
    </header>
    <section class="chat" id="chat"></section>
    <form class="composer" id="composer">
      <label class="sr-only" for="prompt">Prompt</label>
      <textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
      <div class="actions">
        <button type="submit">Send</button>
        <button type="button" id="clear">Clear</button>
      </div>
      <p class="hint" id="hint"></p>
    </form>
  </main>
`;

const chat = document.getElementById("chat");
const composer = document.getElementById("composer") as HTMLFormElement | null;
const prompt = document.getElementById("prompt") as HTMLTextAreaElement | null;
const clearButton = document.getElementById("clear") as HTMLButtonElement | null;
const hint = document.getElementById("hint");
const status = document.getElementById("status");

if (!chat || !composer || !prompt || !clearButton || !hint || !status) {
  throw new Error("Missing UI elements");
}

const chatEl = chat;
const composerEl = composer;
const promptEl = prompt;
const clearButtonEl = clearButton;
const hintEl = hint;
const statusEl = status;

const messages: Message[] = [];

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!apiKey) {
  hintEl.textContent = "Missing VITE_GEMINI_API_KEY. Set it in GitHub Secrets or a local .env file.";
  statusEl.textContent = "API key missing";
}

function render() {
  chatEl.innerHTML = messages
    .map((msg) => {
      const roleClass = msg.role === "user" ? "user" : "assistant";
      return `<div class="message ${roleClass}"><span>${escapeHtml(msg.content)}</span></div>`;
    })
    .join("");
  chatEl.scrollTop = chatEl.scrollHeight;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendMessage(text: string) {
  if (!apiKey) {
    hintEl.textContent = "No API key configured.";
    statusEl.textContent = "API key missing";
    return;
  }

  messages.push({ role: "user", content: text });
  render();

  const payload = {
    contents: messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }))
  };

  try {
    setPending(true);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed (${response.status})`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    messages.push({
      role: "assistant",
      content: reply || "No response returned."
    });
    statusEl.textContent = "Ready";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    messages.push({ role: "assistant", content: `Error: ${message}` });
    statusEl.textContent = "Error";
  } finally {
    setPending(false);
    render();
  }
}

function setPending(isPending: boolean) {
  promptEl.disabled = isPending;
  clearButtonEl.disabled = isPending;
  composerEl.querySelector("button[type='submit']")?.toggleAttribute("disabled", isPending);
  hintEl.textContent = isPending ? "Waiting for Gemini..." : "";
  statusEl.textContent = isPending ? "Thinking" : statusEl.textContent || "Ready";
}

composerEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = promptEl.value.trim();
  if (!text) return;
  promptEl.value = "";
  void sendMessage(text);
});

clearButtonEl.addEventListener("click", () => {
  messages.length = 0;
  render();
});

render();
