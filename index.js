import fs from "fs";
import fetch from "node-fetch";

const USER_ID = 8213751331; 
const WEBHOOK = process.env.DISCORD_WEBHOOK;

const BADGE_URL = `https://badges.roblox.com/v1/users/${USER_ID}/badges?limit=10&sortOrder=Desc`;
const PRESENCE_URL = `https://presence.roblox.com/v1/presence/users`;
const STATE_FILE = "state.json";

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { badges: [], presence: null };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function sendWebhook(msg) {
  if (!WEBHOOK) return;
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: msg })
  });
}

async function checkBadges(state) {
  const res = await fetch(BADGE_URL);
  const data = await res.json();

  if (!data || !Array.isArray(data.data)) {
    console.log("Badge API returned unexpected data:", data);
    return;
  }

  const current = data.data.map(b => b.id);

  // First run guard
  if (!state.badges.length) {
    state.badges = current;
    return;
  }

  const added = current.filter(id => !state.badges.includes(id));
  const removed = state.badges.filter(id => !current.includes(id));

  for (const id of added) {
    await sendWebhook(`🆕 Badge added: ${id}`);
  }

  for (const id of removed) {
    await sendWebhook(`❌ Badge removed: ${id}`);
  }

  state.badges = current;
}

async function checkPresence(state) {
  const res = await fetch(PRESENCE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds: [USER_ID] })
  });

  const data = await res.json();
  const p = data.userPresences[0];

  const map = ["Offline", "Online", "In-Game"];
  const status = map[p.userPresenceType] || "Unknown";

  if (state.presence !== status) {
    await sendWebhook(`🎮 Status: ${state.presence ?? "Unknown"} → ${status}`);
    state.presence = status;
  }
}

async function main() {
  const state = loadState();
  await checkBadges(state);
  await checkPresence(state);
  saveState(state);
}

main();
