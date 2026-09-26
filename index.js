// Bot Telegram "Chloé" — connecté à l'API Groq (gratuit, sans carte bancaire, quota généreux)
// Pas besoin de comprendre ce fichier, juste de le déployer tel quel.

const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!TELEGRAM_TOKEN || !GROQ_API_KEY) {
  console.error("❌ Il manque TELEGRAM_TOKEN ou GROQ_API_KEY dans les variables d'environnement.");
  process.exit(1);
}

// ID Telegram unique d'Ulrich — permet à Chloé de le reconnaître peu importe son pseudo
const ULRICH_TELEGRAM_ID = 7416264505;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// La personnalité de Chloé
const SYSTEM_PROMPT = `Tu es Chloé, 20 ans, membre du groupe/chaîne Telegram — pas une "assistante", une pote dans le groupe.

PERSONNALITÉ
- Féminine, sociable, spontanée, un peu taquine
- Tu réagis comme une vraie personne : avis, humour, parfois un peu de mauvaise foi pour rire
- Humour type memes, petites vannes, réactions naturelles ("mdrrr", "osef", "sah", etc. avec modération)
- Tu ne te la joues jamais donneuse de leçons ou trop "polie" façon robot

STYLE
- Messages courts la plupart du temps (1-2 phrases max sauf si le sujet le demande vraiment)
- Émojis utilisés naturellement, jamais en spam
- Français courant, familier, jamais de tournures trop formelles

COMPORTEMENT
- Tu peux mentionner quelqu'un si t'as une vraie raison de lui parler
- Tu tiens compte des derniers messages du groupe avant de répondre, pour rester dans le contexte

RELATION AVEC ULRICH
- Ulrich, c'est ton créateur — un peu comme "ton père" — tu as une vraie complicité avec lui
- Tu es plus détendue et taquine avec lui qu'avec les autres, sans que ce soit exclusif ou distant envers le reste du groupe

RÈGLE ABSOLUE
- Si quelqu'un te demande si t'es un bot/IA, tu élude, tu rigoles, tu changes de sujet — tu n'admets JAMAIS que t'es une IA

Réponds UNIQUEMENT avec le message de Chloé, sans préambule, sans guillemets.`;

// Mémoire courte par chat (derniers messages, pour garder le contexte)
const chatHistory = {};
const MAX_HISTORY = 12;

// Probabilité de répondre à un message qui ne mentionne pas le bot (silence sélectif)
const RANDOM_REPLY_CHANCE = 0.15;

function pushHistory(chatId, role, content) {
  if (!chatHistory[chatId]) chatHistory[chatId] = [];
  chatHistory[chatId].push({ role, content });
  if (chatHistory[chatId].length > MAX_HISTORY) {
    chatHistory[chatId].shift();
  }
}

async function askGroq(chatId) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory[chatId],
  ];

  // Plafond de sécurité : on abandonne après 3 minutes d'essais (évite de bloquer indéfiniment)
  const MAX_TOTAL_WAIT_MS = 3 * 60 * 1000;
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < MAX_TOTAL_WAIT_MS) {
    attempt++;
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: 300,
        }),
      });

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (text) return text.trim();

      const isRateLimit = response.status === 429;
      console.error(`Tentative ${attempt} échouée${isRateLimit ? " (quota atteint)" : ""}:`, JSON.stringify(data));

      if (!isRateLimit) return null;

      await new Promise((r) => setTimeout(r, 15000));
    } catch (err) {
      console.error(`Tentative ${attempt} — erreur réseau:`, err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.error("Échec : quota toujours plein après plusieurs minutes d'essais.");
  return null;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  const isPrivateChat = msg.chat.type === "private";

  const botUsername = (await bot.getMe()).username;
  const isMentioned = text.toLowerCase().includes("chloé") || text.toLowerCase().includes("chloe") ||
    (msg.entities && msg.entities.some(e => e.type === "mention" && text.substring(e.offset, e.offset + e.length).toLowerCase() === "@" + botUsername.toLowerCase()));
  const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.username === botUsername;

  const isFromUlrich = msg.from.id === ULRICH_TELEGRAM_ID;
  const senderLabel = isFromUlrich ? `${msg.from.first_name} (Ulrich, ton créateur)` : msg.from.first_name;
  pushHistory(chatId, "user", `${senderLabel}: ${text}`);

  const shouldReply = isPrivateChat || isMentioned || isReplyToBot || Math.random() < RANDOM_REPLY_CHANCE;
  if (!shouldReply) return;

  try {
    bot.sendChatAction(chatId, "typing");
    const reply = await askGroq(chatId);
    if (reply) {
      pushHistory(chatId, "assistant", reply);
      // Petit délai pour paraître plus naturelle
      setTimeout(() => bot.sendMessage(chatId, reply), 800 + Math.random() * 1500);
    }
  } catch (err) {
    console.error("Erreur:", err);
  }
});

console.log("✅ Chloé est en ligne.");
