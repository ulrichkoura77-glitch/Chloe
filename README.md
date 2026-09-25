# Bot Chloé — Guide de déploiement (gratuit, sans code à écrire)

## Ce que tu as déjà
- Un bot Telegram créé via BotFather (tu as le **token**)

## Ce qu'il te faut en plus
- Une **clé API Google Gemini** (gratuite, sans carte bancaire) pour faire "parler" Chloé
  → va sur https://aistudio.google.com/
  → connecte-toi avec un compte Google
  → clique sur "Get API key" → "Create API key"
  → copie la clé générée

## Étapes de déploiement sur Railway (gratuit)

1. Va sur https://railway.app/ et connecte-toi avec ton compte GitHub (crée un compte GitHub gratuit si tu n'en as pas)
2. Crée un nouveau repo GitHub (ex: `chloe-bot`) et mets-y les 3 fichiers de ce dossier : `index.js`, `package.json`, `README.md`
   - Le plus simple : sur GitHub, clique "Create new repository" → "uploading an existing file" → glisse les 3 fichiers
3. Sur Railway, clique "New Project" → "Deploy from GitHub repo" → sélectionne ton repo `chloe-bot`
4. Railway va détecter le projet Node.js automatiquement et commencer à builder
5. Va dans l'onglet **"Variables"** du projet Railway, et ajoute :
   - `TELEGRAM_TOKEN` = ton token BotFather
   - `GEMINI_API_KEY` = ta clé API Gemini
6. Railway redéploie automatiquement après l'ajout des variables
7. Regarde les **"Logs"** : tu dois voir `✅ Chloé est en ligne.`

## Test
- Ajoute ton bot dans ton groupe Telegram (recherche son @username, "Ajouter au groupe")
- Important : dans **BotFather**, envoie `/mybots` → sélectionne ton bot → **Bot Settings** → **Group Privacy** → **Turn off**
  (sinon le bot ne voit pas les messages du groupe qui ne le mentionnent pas directement)
- Écris "Chloé" ou mentionne-la dans le groupe → elle doit répondre

## Notes
- Le plan gratuit Railway offre un crédit mensuel qui suffit largement pour un bot de groupe actif
- Si le bot s'arrête après un moment d'inactivité, c'est normal sur certains plans gratuits — un message dans le groupe le relance
