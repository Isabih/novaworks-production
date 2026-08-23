export function sampleAnalytics(seed = 1) {
  const days = 30;
  const out: Array<{ date: string; views: number; inquiries: number; bookings: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 1800 + Math.sin((i + seed) * 0.6) * 600 + Math.random() * 400;
    out.push({
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      views: Math.round(base),
      inquiries: Math.round(60 + Math.random() * 40),
      bookings: Math.round(15 + Math.random() * 25),
    });
  }
  return out;
}