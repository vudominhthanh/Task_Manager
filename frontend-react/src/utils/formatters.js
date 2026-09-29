const pad = (n) => String(n).padStart(2, "0");

export const formatDate = (input, format = "DD/MM/YYYY") => {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const DD = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const YYYY = d.getFullYear();

  return format
    .replace("DD", DD)
    .replace("MM", MM)
    .replace("YYYY", YYYY);
};

export const formatTime = (input, format = "24h") => {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  let h = d.getHours();
  const m = pad(d.getMinutes());

  if (format === "12h") {
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${pad(h)}:${m} ${suffix}`;
  }
  return `${pad(h)}:${m}`;
};

export const formatDateTime = (input, dateFormat = "DD/MM/YYYY", timeFormat = "24h") =>
  `${formatDate(input, dateFormat)} ${formatTime(input, timeFormat)}`.trim();