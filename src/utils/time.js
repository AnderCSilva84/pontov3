export function minutesToHHMM(minutes) {
  if (!minutes && minutes !== 0) return "00:00";

  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);

  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}