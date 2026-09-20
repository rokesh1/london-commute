export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });
  const repository = process.env.HISTORY_REPOSITORY || "rokesh1/london-commute";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
    return res.status(500).json({ error: "History is not configured." });
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/observations/history.json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (response.status === 404)
      return res.status(200).json({ samples: [], collecting: true });
    if (!response.ok) throw new Error("History unavailable");
    const data = await response.json();
    if (!Array.isArray(data.samples)) throw new Error("Invalid history");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60",
    );
    return res.status(200).json(data);
  } catch {
    return res
      .status(502)
      .json({ error: "Observation history is temporarily unavailable." });
  }
}
