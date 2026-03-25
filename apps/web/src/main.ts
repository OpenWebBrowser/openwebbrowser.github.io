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
          <p>AI chat + proxied web viewer</p>
        </div>
      </div>
      <div class="status" id="status"></div>
    </header>

    <nav class="tabs" aria-label="Primary">
      <button class="tab active" type="button" data-tab="chat">AI Chat</button>
      <button class="tab" type="button" data-tab="browser">Browser</button>
    </nav>

    <section class="panel" id="panel-chat">
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
    </section>

    <section class="panel hidden" id="panel-browser">
      <form class="browser-bar" id="browser-form">
        <label class="sr-only" for="url">URL</label>
        <input id="url" type="url" placeholder="https://example.com" autocomplete="off" />
        <button type="submit">Go</button>
        <button type="button" id="back">Back</button>
        <button type="button" id="forward">Forward</button>
      </form>
      <div class="browser-status" id="browser-status"></div>
      <div class="browser-frame">
        <iframe
          id="browser-frame"
          title="Proxied web view"
          sandbox="allow-forms allow-popups allow-scripts"
          referrerpolicy="no-referrer"
        ></iframe>
      </div>
    </section>
  </main>
`;

const status = document.getElementById("status");
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
const panelChat = document.getElementById("panel-chat");
const panelBrowser = document.getElementById("panel-browser");

const chat = document.getElementById("chat");
const composer = document.getElementById("composer") as HTMLFormElement | null;
const prompt = document.getElementById("prompt") as HTMLTextAreaElement | null;
const clearButton = document.getElementById("clear") as HTMLButtonElement | null;
const hint = document.getElementById("hint");

const browserForm = document.getElementById("browser-form") as HTMLFormElement | null;
const urlInput = document.getElementById("url") as HTMLInputElement | null;
const backButton = document.getElementById("back") as HTMLButtonElement | null;
const forwardButton = document.getElementById("forward") as HTMLButtonElement | null;
const browserStatus = document.getElementById("browser-status");
const browserFrame = document.getElementById("browser-frame") as HTMLIFrameElement | null;

if (
  !status ||
  !panelChat ||
  !panelBrowser ||
  !chat ||
  !composer ||
  !prompt ||
  !clearButton ||
  !hint ||
  !browserForm ||
  !urlInput ||
  !backButton ||
  !forwardButton ||
  !browserStatus ||
  !browserFrame
) {
  throw new Error("Missing UI elements");
}

const statusEl = status;
const panelChatEl = panelChat;
const panelBrowserEl = panelBrowser;
const chatEl = chat;
const composerEl = composer;
const promptEl = prompt;
const clearButtonEl = clearButton;
const hintEl = hint;
const browserFormEl = browserForm;
const urlInputEl = urlInput;
const backButtonEl = backButton;
const forwardButtonEl = forwardButton;
const browserStatusEl = browserStatus;
const browserFrameEl = browserFrame;

const messages: Message[] = [];

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://api.example.com";

if (!apiKey) {
  hintEl.textContent = "Missing VITE_GEMINI_API_KEY. Set it in GitHub Secrets or a local .env file.";
  statusEl.textContent = "API key missing";
} else {
  statusEl.textContent = "Ready";
}

if (apiBase.includes("example.com")) {
  browserStatusEl.textContent = "Set VITE_API_BASE to your proxy API to load real pages.";
}

function setActiveTab(tab: "chat" | "browser") {
  tabs.forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("active", isActive);
  });
  panelChatEl.classList.toggle("hidden", tab !== "chat");
  panelBrowserEl.classList.toggle("hidden", tab !== "browser");
}

tabs.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab === "browser" ? "browser" : "chat";
    setActiveTab(tab);
  });
});

function renderChat() {
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
  renderChat();

  const payload = {
    contents: messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }))
  };

  try {
    setChatPending(true);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    setChatPending(false);
    renderChat();
  }
}

function setChatPending(isPending: boolean) {
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
  renderChat();
});

const browserHistory: string[] = [];
let browserIndex = -1;

function updateBrowserNav() {
  backButtonEl.disabled = browserIndex <= 0;
  forwardButtonEl.disabled = browserIndex >= browserHistory.length - 1;
}

async function navigateTo(url: string, pushHistory = true) {
  if (!url) return;
  const normalized = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  if (pushHistory) {
    browserHistory.splice(browserIndex + 1);
    browserHistory.push(normalized);
    browserIndex = browserHistory.length - 1;
    updateBrowserNav();
  }

  urlInputEl.value = normalized;
  browserStatusEl.textContent = "Loading...";

  try {
    const response = await fetch(`${apiBase}/proxy?url=${encodeURIComponent(normalized)}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Proxy failed (${response.status})`);
    }
    const html = await response.text();
    browserFrameEl.srcdoc = html;
    browserStatusEl.textContent = "Loaded";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    browserFrameEl.srcdoc = `<!doctype html><html><body><pre>${escapeHtml(
      `Proxy error: ${message}`
    )}</pre></body></html>`;
    browserStatusEl.textContent = "Error";
  }
}

browserFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = urlInputEl.value.trim();
  void navigateTo(url, true);
});

backButtonEl.addEventListener("click", () => {
  if (browserIndex > 0) {
    browserIndex -= 1;
    void navigateTo(browserHistory[browserIndex], false);
    updateBrowserNav();
  }
});

forwardButtonEl.addEventListener("click", () => {
  if (browserIndex < browserHistory.length - 1) {
    browserIndex += 1;
    void navigateTo(browserHistory[browserIndex], false);
    updateBrowserNav();
  }
});

updateBrowserNav();
renderChat();
