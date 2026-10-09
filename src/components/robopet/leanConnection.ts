// A visitor on a metered or slow link: the browser's Save-Data switch is on, or the connection
// is rated 3g or worse. Chromium reports both through navigator.connection; Safari and Firefox
// have no such object, and for them every visitor counts as on a normal link.
type NetworkInformation = { saveData?: boolean; effectiveType?: string };

export function leanConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return false;
  const type = connection.effectiveType;
  return Boolean(
    connection.saveData || type === "slow-2g" || type === "2g" || type === "3g",
  );
}
