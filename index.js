// Bot Telegram "Chloé" — connecté à l'API Google Gemini (gratuit, sans carte bancaire)
// Pas besoin de comprendre ce fichier, juste de le déployer tel quel.

const TelegramBot = require("node-telegram-bot-api");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TELEGRAM_TOKEN || !GEMINI_API_KEY) {
  console.error("❌ Il manque TELEGRAM_TOKEN ou GEMINI_API_KEY dans les variables d'environnement.");
  process.exit(1);
}

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

async function askGemini(chatId) {
  // Gemini n'a pas de rôle "system" séparé comme Claude : on colle
  // la personnalité en première instruction, puis l'historique.
  const contents = chatHistory[chatId].map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Réponse API inattendue:", JSON.stringify(data));
    return null;
  }
  return text.trim();
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text) return;

  const botUsername = (await bot.getMe()).username;
  const isMentioned = text.toLowerCase().includes("chloé") || text.toLowerCase().includes("chloe") ||
    (msg.entities && msg.entities.some(e => e.type === "mention" && text.substring(e.offset, e.offset + e.length).toLowerCase() === "@" + botUsername.toLowerCase()));
  const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.username === botUsername;

  pushHistory(chatId, "user", `${msg.from.first_name}: ${text}`);

  const shouldReply = isMentioned || isReplyToBot || Math.random() < RANDOM_REPLY_CHANCE;
  if (!shouldReply) return;

  try {
    bot.sendChatAction(chatId, "typing");
    const reply = await askGemini(chatId);
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
