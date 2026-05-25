import { useState, useRef, useId } from "react";
import html2canvas from "html2canvas";
import { questions } from "./questions";
import "./App.css";

const CHARACTERS = [
  "博麗霊夢", "霧雨魔理沙", "十六夜咲夜", "アリス・マーガトロイド",
  "パチュリー・ノーレッジ", "魂魄妖夢", "レミリア・スカーレット",
  "西行寺幽々子", "八雲紫", "鈴仙・優曇華院・イナバ", "射命丸文",
  "伊吹萃香", "小野塚小町", "比那名居天子", "永江衣玖",
  "東風谷早苗", "チルノ", "霊烏路空", "洩矢諏訪子", "紅美鈴",
];

// フォーム表示用（7分割）
const FORM_SECTIONS = [
  { label: "プロフィール", range: [1, 10] },
  { label: "キャラクター", range: [11, 30] },
  { label: "プレイスタイル", range: [31, 50] },
  { label: "自己評価", range: [51, 60] },
  { label: "コミュニティ", range: [61, 75] },
  { label: "思い出", range: [76, 90] },
  { label: "展望・その他", range: [91, 100] },
];

// 画像出力用（4枚）
const IMG_SECTIONS = [
  {
    label: "プロフィール・キャラクター",
    sub: [
      { label: "プロフィール", range: [1, 10] },
      { label: "キャラクター", range: [11, 30] },
    ],
  },
  {
    label: "プレイスタイル・自己評価",
    sub: [
      { label: "プレイスタイル", range: [31, 50] },
      { label: "自己評価", range: [51, 60] },
    ],
  },
  {
    label: "コミュニティ・思い出",
    sub: [
      { label: "コミュニティ", range: [61, 75] },
      { label: "思い出", range: [76, 90] },
    ],
  },
  {
    label: "展望・その他",
    sub: [
      { label: "展望・その他", range: [91, 100] },
    ],
  },
];

function SectionCard({ section, answers, cardRef }) {
  return (
    <div className="img-card" ref={cardRef}>
      <div className="img-card-header">
        <span className="img-card-title">東方非想天則 天則勢100の質問</span>
        <span className="img-card-section">{section.label}</span>
      </div>
      {section.sub.map((sub, i) => {
        const sectionQs = questions.filter(
          (q) => q.id >= sub.range[0] && q.id <= sub.range[1]
        );
        return (
          <div key={sub.label}>
            {section.sub.length > 1 && (
              <div className={`img-sub-label ${i > 0 ? "img-sub-label--gap" : ""}`}>
                {sub.label}
              </div>
            )}
            {sectionQs.map((q) => (
              <div key={q.id} className="img-card-row">
                <div className="img-card-q">
                  <span className="img-q-num">Q{q.id}</span>
                  {q.text}
                </div>
                <div className="img-card-a">
                  {answers[q.id]?.trim() || "（未回答）"}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem("tensoku100q_answers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("form");
  const [generating, setGenerating] = useState(null);
  const cardRefs = useRef({});

  const handleChange = (id, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      localStorage.setItem("tensoku100q_answers", JSON.stringify(next));
      return next;
    });
  };

  const handleReset = () => {
    if (!confirm("回答をすべてリセットしますか？")) return;
    localStorage.removeItem("tensoku100q_answers");
    setAnswers({});
  };

  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;
  const progress = Math.round((answeredCount / 100) * 100);

  const buildText = () => {
    const lines = ["【東方非想天則 天則勢100の質問】", ""];
    questions.forEach((q) => {
      lines.push(`Q${q.id}. ${q.text}`);
      lines.push(`→ ${answers[q.id]?.trim() || "（未回答）"}`);
      lines.push("");
    });
    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    const blob = new Blob([buildText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "天則勢100の質問.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async (section) => {
    const ref = cardRefs.current[section.label];
    if (!ref) return;
    setGenerating(section.label);
    try {
      const canvas = await html2canvas(ref, {
        scale: 2,
        backgroundColor: "#100c0c",
        useCORS: true,
      });
      const filename = `天則勢100の質問_${section.label}.png`;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
    }
  };

  if (view === "result") {
    return (
      <div className="container">
        <div className="result-header">
          <h1 style={{ color: "#c9aaff", fontSize: "1.4rem" }}>回答結果</h1>
          <button className="btn-secondary" onClick={() => setView("form")}>
            ← 編集に戻る
          </button>
        </div>

        <div className="output-actions">
          <button className="btn-primary" onClick={handleCopy}>
            {copied ? "コピーしました！" : "テキストをコピー"}
          </button>
          <button className="btn-secondary" onClick={handleDownloadText}>
            テキストを保存 (.txt)
          </button>
        </div>

        <div className="result-box">
          <pre>{buildText()}</pre>
        </div>

        <h2 className="section-img-heading">セクション別 画像保存</h2>
        <div className="section-img-list">
          {IMG_SECTIONS.map((section) => (
            <div key={section.label} className="section-img-item">
              <SectionCard
                section={section}
                answers={answers}
                cardRef={(el) => (cardRefs.current[section.label] = el)}
              />
              <button
                className="btn-dl"
                onClick={() => handleDownloadImage(section)}
                disabled={generating === section.label}
              >
                {generating === section.label ? "生成中..." : `${section.label} を保存`}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>東方非想天則<br />天則勢100の質問</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="header-meta">
          <span className="progress-label">{answeredCount} / 100 問回答済み</span>
          <span className="autosave-badge">自動保存済み</span>
          <button className="btn-reset" onClick={handleReset}>リセット</button>
        </div>
      </header>

      {FORM_SECTIONS.map((section) => {
        const sectionQs = questions.filter(
          (q) => q.id >= section.range[0] && q.id <= section.range[1]
        );
        return (
          <section key={section.label} className="section">
            <h2>{section.label}</h2>
            {sectionQs.map((q) => (
              <div key={q.id} className="question-row">
                <label htmlFor={`q${q.id}`}>
                  <span className="q-num">Q{q.id}</span>
                  {q.text}
                </label>
                {q.type === "character" ? (
                  <>
                    <input
                      id={`q${q.id}`}
                      list="chara-list"
                      className="chara-input"
                      value={answers[q.id] || ""}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      placeholder="キャラ名を入力または選択..."
                    />
                    <datalist id="chara-list">
                      {CHARACTERS.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </>
                ) : (
                  <>
                    <textarea
                      id={`q${q.id}`}
                      rows={q.maxLength ? 3 : 2}
                      maxLength={q.maxLength ?? 100}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      placeholder="回答を入力..."
                    />
                    <span className="char-count">
                      {(answers[q.id] || "").length} / {q.maxLength ?? 100}
                    </span>
                  </>
                )}
              </div>
            ))}
          </section>
        );
      })}

      <div className="submit-bar">
        <button className="btn-primary" onClick={() => setView("result")}>
          回答を確認・出力 →
        </button>
      </div>
    </div>
  );
}
