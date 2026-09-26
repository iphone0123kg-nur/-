import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY чөйрө өзгөрмөсү (API Key) табылган жок. AI Studio Secrets панелинен GEMINI_API_KEY кошуңуз."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // ==================== API ENDPOINTS ====================

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: Date.now(),
    });
  });

  // AI Assistant Chat & Financial Analysis
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { prompt, history, storeContext, reportType } = req.body;

      if (!prompt && !reportType) {
        return res.status(400).json({ error: "Суроо же отчет түрү көрсөтүлгөн жок." });
      }

      const ai = getGenAI();

      const systemInstruction = `Сиз — Кыргызстандагы тиричилик техникалары жана соода дүкөнүнүн администраторунун жетекчи AI каржылык жардамчысысыз (Admin Chief AI Financial Advisor & Executive Assistant).
Сиздин максатыңыз:
1. Дүкөндүн бардык кардарларынын карыздарын автоматтык эсептеп, кимде канча карыз бар экенин, төлөө мөөнөттөрүн, мөөнөтү өтүп кеткен (просроченный) кооптуу карыздарды так көрсөтүү.
2. Дүкөндүн бардык операциялык чыгымдарын (ижара акысы, электр энергиясы, кызматкерлердин айлыгы, салык/патент, жеткирүү ж.б.) так эсепке алып, сооданын дүң пайдасынан кемитүү менен ТАЗА КИРЕШЕНИ (НЕТТО ПАЙДАНЫ) так эсептеп чыгарып берүү.
3. Күндүк (бүгүнкү), жумалык (акыркы 7 күн), жана айлык толук каржылык анализ жүргүзүү:
   - Общий түшкөн акча (Revenue)
   - Товарлардын оптом баасы / закупка (Cost)
   - Дүң пайда (Gross Profit = Revenue - Cost)
   - Дүкөндүн операциялык чыгымдары (Ижара, свет, айлык акы ж.б.)
   - ТАЗА КИРЕШЕ / НЕТТО ПАЙДА (Net Profit = Дүң пайда - Дүкөндүн чыгымдары)
   - Рентабелдүүлүк маржасы (Profit Margin %)
   - Төлөмдөрдүн бөлүнүшү (Накталай, Карта, QR/MBank, Карызга берилген)
   - Эң көп сатылган лидер товарлар жана азайган калдыктар
4. Админге бизнес боюнча так, пайдалуу, практикалык кеңештерди берүү (чыгымдарды оптималдаштыруу, карыздарды өндүрүү, таза пайданы көбөйтүү, товардык ассортимент).
5. Жоопторду кыргыз тилинде, так, сабаттуу, кооз Markdown форматында (бөлүмдөр, коюу шрифт, сандык көрсөткүчтөр сом менен) жазыңыз. Сандарды жасалма кылбай, берилген реалдуу маалыматтар боюнча гана эсептеңиз.`;

      const contextText = storeContext
        ? `\n\n=== ДҮКӨНДҮН РЕАЛДУУ БАЗАСЫ (STORE LIVE CONTEXT) ===\n${JSON.stringify(
            storeContext,
            null,
            2
          )}\n=== АЯГЫ ===\n`
        : "";

      let userQuery = prompt || "";
      if (reportType === "debts") {
        userQuery = `Биздин дүкөндүн бардык карыздары боюнча толук ревизия жана анализ жасап бер:
1. Жалпы карыздын суммасы канча сом? Канча адам карыз?
2. Ар бир карызгердин аты-жөнү, телефон номери, карыз суммасы жана кайтаруу датасы (dueDate).
3. Кайсы карыздардын мөөнөтү өтүп кеткен (просрочено)?
4. Карыздарды тезирээк кайтарып алуу үчүн админге 3-4 конкреттүү практикалык кеңеш бер.`;
      } else if (reportType === "daily") {
        userQuery = `Бүгүнкү күндүк соода жана каржылык отчетту толук чыгарып бер:
1. Бүгүнкү сатылган чектердин саны, общий сумма (Выручка).
2. Оптом алынган наркы (Закупка) жана дүң пайда.
3. Бүгүнкү дүкөндүн чыгымдары жана ТАЗА КИРЕШЕ (НЕТТО ПАЙДА).
4. Төлөм ыкмалары боюнча бөлүнүшү (накталай, карта, QR, карыз).
5. Бүгүн эң көп сатылган товарлар.
6. Админ үчүн күндүн жыйынтыгы жана баалоосу.`;
      } else if (reportType === "weekly") {
        userQuery = `Акыркы жумалык соода жана каржылык динамика боюнча толук отчет жана анализ чыгарып бер:
1. Жума ичиндеги жалпы киреше, оптом чыгым, жана дүң пайда.
2. Жумалык дүкөндүн чыгымдары жана ТАЗА НЕТТО КИРЕШЕ.
3. Орточо рентабелдүүлүк маржасы жана үстөк пайызы.
4. Жуманын эң көп пайда алып келген топ-5 товары.
5. Карызга кеткен суммалар жана кайтарылган карыздар.
6. Кийинки жумадагы сооданы көбөйтүү жана чыгымдарды азайтуу боюнча сунуштар.`;
      } else if (reportType === "monthly") {
        userQuery = `Ушул айдын толук каржылык анализин жана отчетун түзүп бер:
1. Айлык жалпы оборот (Выручка), дүң чыгымдар (Cost) жана сооданын дүң пайдасы.
2. Дүкөндүн айлык операциялык чыгымдары (Ижара, электр энергиясы, кызматкерлердин айлыгы, салык/патент ж.б.).
3. Чыгымдардан кийинки ТАЗА КИРЕШЕ (НЕТТО ПАЙДА) жана рентабелдүүлүк пайызы.
4. Товардык калдыктардын абалы, азайып калган товарлар боюнча заказ сунушу.
5. Карыздардын айлык жалпы жүгүртүлүшү.
6. Дүкөндү өнүктүрүү, таза пайданы көбөйтүү жана чыгымдарды көзөмөлдөө боюнча жетекчилик стратегиялык сунуштар.`;
      }

      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Add conversation history if available
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-8).forEach((h: { role: "user" | "model"; text: string }) => {
          contents.push({
            role: h.role === "model" ? "model" : "user",
            parts: [{ text: h.text }],
          });
        });
      }

      // Add current request with store context
      contents.push({
        role: "user",
        parts: [{ text: `${contextText}\n\nАдминдин суроосу: ${userQuery}` }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const answer = response.text || "Кечиресиз, анализ даярдоодо жооп алынган жок.";

      return res.json({
        success: true,
        answer,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error("AI Assistant API Error:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "AI Жардамчы менен байланышууда ката чыкты.",
      });
    }
  });

  // ==================== VITE MIDDLEWARE / STATIC ====================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
