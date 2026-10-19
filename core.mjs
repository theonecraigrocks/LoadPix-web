export const CATEGORIES = Object.freeze({
  Pickup: Object.freeze(["Freight", "Seal", "Back of trailer", "Trailer temperature", "Paperwork"]),
  Delivery: Object.freeze(["Signed paperwork"])
});

export function heading(type) {
  if (type === "Pickup") return "LOAD PICKUP";
  if (type === "Delivery") return "LOAD DELIVERY";
  throw new Error("Unsupported load type");
}

export function normalizePhone(value) {
  const input = String(value || "").trim();
  if (!/^\+?[0-9 ()-]+$/.test(input)) return "";
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? (input.startsWith("+") ? "+" : "") + digits : "";
}

export function normalizeBOL(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export function newSession(type, profile, id, createdAt) {
  heading(type);
  return {
    id, type, createdAt,
    driver: String(profile.driver || "").trim().slice(0, 80),
    truck: String(profile.truck || "").trim().slice(0, 40),
    trailer: "", bol4: "", note: "", photos: []
  };
}

export function missingPhotos(session) {
  const covered = new Set((session.photos || []).map(p => p.category));
  return CATEGORIES[session.type].filter(c => !covered.has(c));
}

export function messageBody(session) {
  const lines = [heading(session.type)];
  if (session.driver?.trim()) lines.push("Driver: " + session.driver.trim());
  if (session.truck?.trim()) lines.push("Truck: " + session.truck.trim());
  if (session.trailer?.trim()) lines.push("Trailer: " + session.trailer.trim());
  if (session.bol4?.trim()) lines.push("BOL last 4: " + normalizeBOL(session.bol4));
  if (session.note?.trim()) lines.push("Note: " + session.note.trim());
  const date = new Date(session.createdAt);
  if (!Number.isNaN(date.getTime())) lines.push(date.toLocaleString());
  return lines.join("\n");
}

export function batchCount(session, batchSize = 3) {
  return Math.ceil((session.photos || []).length / batchSize);
}
