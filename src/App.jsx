import { useState, useRef } from "react";
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

// 表記ゆれ（全角/半角スペース・中黒の有無など）を吸収してCHARACTERSの表記に揃える
const normalizeCharaKey = (s) =>
  s.replace(/[・･\s\u3000]/g, "").normalize("NFKC");

const CHARA_LOOKUP = new Map(
  CHARACTERS.map((c) => [normalizeCharaKey(c), c])
);

const resolveCharaName = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const canonical = CHARA_LOOKUP.get(normalizeCharaKey(trimmed));
  return canonical ?? trimmed;
};

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
  const [showUnanswered, setShowUnanswered] = useState(false);
  const cardRefs = useRef({});
  const importInputRef = useRef(null);

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

  const handleResetSection = (section) => {
    if (!confirm(`「${section.label}」の回答をリセットしますか？`)) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (let id = section.range[0]; id <= section.range[1]; id++) {
        delete next[id];
      }
      localStorage.setItem("tensoku100q_answers", JSON.stringify(next));
      return next;
    });
  };

  const answeredCount = Object.values(answers).filter((v) => v.trim() !== "").length;
  const progress = Math.round((answeredCount / 100) * 100);
  const unanswered = questions.filter((q) => !answers[q.id]?.trim());

  const jumpToQuestion = (id) => {
    const el = document.getElementById(`q${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
  };

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleExportJSON = () => {
    const payload = {
      app: "tensoku100q",
      version: 1,
      exportedAt: new Date().toISOString(),
      answers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "天則勢100の質問_回答データ.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続選択しても発火するようにリセット
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = parsed && typeof parsed === "object" && parsed.answers
        ? parsed.answers
        : parsed; // 生のanswersオブジェクトが渡された場合にも対応
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        throw new Error("invalid shape");
      }
      if (!confirm("読み込んだデータで現在の回答を上書きします。よろしいですか？")) return;
      const next = {};
      for (const [key, value] of Object.entries(incoming)) {
        const id = Number(key);
        if (Number.isInteger(id) && typeof value === "string") next[id] = value;
      }
      localStorage.setItem("tensoku100q_answers", JSON.stringify(next));
      setAnswers(next);
    } catch {
      alert("ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。");
    }
  };

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

  const renderSectionImage = async (section) => {
    const ref = cardRefs.current[section.label];
    if (!ref) return null;
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(ref, {
      scale: 2,
      backgroundColor: "#100c0c",
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async (section) => {
    setGenerating(section.label);
    try {
      const blob = await renderSectionImage(section);
      if (blob) saveBlob(blob, `天則勢100の質問_${section.label}.png`);
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadAllImages = async () => {
    setGenerating("__all__");
    try {
      for (const section of IMG_SECTIONS) {
        const blob = await renderSectionImage(section);
        if (blob) saveBlob(blob, `天則勢100の質問_${section.label}.png`);
        // 連続ダウンロードがブラウザにブロックされないよう少し間隔を空ける
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
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

        <div className="section-img-heading-row">
          <h2 className="section-img-heading">セクション別 画像保存</h2>
          <button
            className="btn-primary btn-dl-all"
            onClick={handleDownloadAllImages}
            disabled={generating !== null}
          >
            {generating === "__all__" ? "生成中..." : "4枚まとめて保存"}
          </button>
        </div>
        <p className="dl-all-hint">
          ダウンロード後、保存した4枚をまとめて1つの投稿に添付できます。
        </p>
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
                disabled={generating !== null}
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
        <svg className="crest-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
        <h1>東方非想天則<br />天則勢100の質問</h1>
        <div className="header-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-gem" />
          <span className="divider-line" />
        </div>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="回答の進捗"
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="header-meta">
          <span className="progress-label">{answeredCount} / 100 問回答済み</span>
          <span className="autosave-badge">自動保存済み</span>
          {unanswered.length > 0 && (
            <button
              className="btn-reset"
              onClick={() => setShowUnanswered((v) => !v)}
            >
              未回答 {unanswered.length}件{showUnanswered ? " ▲" : " ▼"}
            </button>
          )}
          <button className="btn-reset" onClick={handleReset}>リセット</button>
        </div>
        <div className="header-meta">
          <button className="btn-reset" onClick={handleExportJSON}>
            バックアップを保存 (.json)
          </button>
          <button className="btn-reset" onClick={handleImportClick}>
            バックアップから復元
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImportFile}
          />
        </div>
        {showUnanswered && unanswered.length > 0 && (
          <div className="unanswered-panel">
            {unanswered.map((q) => (
              <button
                key={q.id}
                className="unanswered-chip"
                onClick={() => jumpToQuestion(q.id)}
              >
                Q{q.id}
              </button>
            ))}
          </div>
        )}
        <nav className="section-nav">
          {FORM_SECTIONS.map((section) => (
            <a key={section.label} href={`#section-${section.label}`} className="section-nav-link">
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      {FORM_SECTIONS.map((section) => {
        const sectionQs = questions.filter(
          (q) => q.id >= section.range[0] && q.id <= section.range[1]
        );
        return (
          <section key={section.label} id={`section-${section.label}`} className="section">
            <div className="section-heading-row">
              <h2>{section.label}</h2>
              <button
                className="btn-section-reset"
                onClick={() => handleResetSection(section)}
              >
                このセクションをリセット
              </button>
            </div>
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
                      onBlur={(e) => {
                        const resolved = resolveCharaName(e.target.value);
                        if (resolved !== e.target.value) handleChange(q.id, resolved);
                      }}
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
                      ref={autoResize}
                      rows={q.maxLength ? 3 : 2}
                      maxLength={q.maxLength ?? 100}
                      value={answers[q.id] || ""}
                      onChange={(e) => {
                        handleChange(q.id, e.target.value);
                        autoResize(e.target);
                      }}
                      placeholder="回答を入力..."
                    />
                    <span
                      className={`char-count ${
                        (answers[q.id] || "").length >= (q.maxLength ?? 100) * 0.9
                          ? "char-count--warn"
                          : ""
                      }`}
                    >
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
