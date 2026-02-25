import { useState, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ═══════════════════════════════════ STYLES ═══════════════════════════════════ */
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#060b14;--c1:#0c1622;--c2:#101e2e;--c3:#152437;
      --bd:#1e3250;--bd2:#263e60;
      --tx:#eaf1fb;--t2:#7a9cbf;--t3:#3a5470;
      --gr:#0fd9a0;--gr2:rgba(15,217,160,.11);--gr3:rgba(15,217,160,.28);
      --ye:#f7cc45;--ye2:rgba(247,204,69,.11);
      --re:#f2556e;--re2:rgba(242,85,110,.11);
      --bl:#4f8ef5;--bl2:rgba(79,142,245,.11);
      --pu:#a87cf8;--pu2:rgba(168,124,248,.11);
      --cy:#25d8f0;--cy2:rgba(37,216,240,.11);
      --or:#fc9840;--or2:rgba(252,152,64,.11);
    }
    html,body{height:100%;background:var(--bg);color:var(--tx);font-family:'Plus Jakarta Sans',sans-serif}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:4px}
    button,input,textarea,select{font-family:'Plus Jakarta Sans',sans-serif}
    textarea:focus,input:focus{outline:none}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pop{0%{opacity:0;transform:scale(.88)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes ringFill{from{stroke-dashoffset:var(--ring-full)}to{stroke-dashoffset:var(--ring-offset)}}
    .fu{animation:fu .42s ease both}
    .pop{animation:pop .4s cubic-bezier(.34,1.56,.64,1) both}
    .slide-up{animation:slideUp .35s ease both}
    .fade{animation:fadeIn .3s ease both}
    .shimmer-skeleton{background:linear-gradient(90deg,var(--c2) 25%,var(--c3) 50%,var(--c2) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite}
  `}</style>
);

/* ═══════════════════════════════ SYLLABUS PARSER ═══════════════════════════════ */
function parseSyllabus(raw) {
  const lines = raw.split(/\r?\n/);
  const units = [],
    unitRe =
      /^(unit|chapter|module|section|part|block|lecture|topic)\s*[\d:.\-–—]*(.*)/i;
  const bulletRe = /^[\s]*[-•*▸▹◦‣⁃→⟶✓✦▪]\s+(.+)/,
    numberedRe = /^[\s]*\d+[\d.]*[\s\t.):]+(.+)/;
  let cur = null,
    ui = 0;

  const addUnit = (n) => {
    ui++;
    cur = {
      id: `u${ui}`,
      name:
        (n || "")
          .trim()
          .replace(/^[:.\-–—\s]+/, "")
          .trim() || `Unit ${ui}`,
      topics: [],
    };
    units.push(cur);
  };
  const addTopic = (n) => {
    const clean = n
      .trim()
      .replace(/\s*[:(]\s*$/, "")
      .trim()
      .slice(0, 80);
    if (clean.length < 2) return;
    if (!cur) addUnit("General");
    cur.topics.push({
      id: `u${ui}t${cur.topics.length + 1}`,
      name: clean,
      difficulty: 2,
      keywords: clean
        .split(/[\s,;]+/)
        .filter((w) => w.length > 3)
        .slice(0, 4),
      learningObjective: `Understand and apply: ${clean}`,
    });
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const um = t.match(unitRe);
    if (um) {
      let n = (um[2] || "").trim();
      if (!n && lines[i + 1]) n = lines[i + 1].trim();
      return addUnit(n || t);
    }
    const bm = t.match(bulletRe);
    if (bm) return addTopic(bm[1]);
    const nm = t.match(numberedRe);
    if (nm) return addTopic(nm[1]);
    const im = line.match(/^(\s{2,})([A-Z].{3,})/);
    if (im && cur) return addTopic(im[2]);
    if (
      t === t.toUpperCase() &&
      t.length > 5 &&
      t.length < 80 &&
      /[A-Z]/.test(t)
    )
      return addUnit(t);
    if (
      cur &&
      t.length > 3 &&
      t.length < 100 &&
      t.split(/\s+/).length <= 8 &&
      !/[.?!]$/.test(t)
    )
      addTopic(t);
  });

  if (!units.length || units.every((u) => !u.topics.length)) {
    const fb = { id: "u1", name: "Course Topics", topics: [] };
    lines.forEach((l) => {
      const t = l.trim();
      if (t.length > 3 && t.length < 120)
        fb.topics.push({
          id: `u1t${fb.topics.length + 1}`,
          name: t
            .replace(/^[-•*\d.):]+\s*/, "")
            .trim()
            .slice(0, 80),
          difficulty: 2,
          keywords: [],
          learningObjective: `Understand: ${t.slice(0, 40)}`,
        });
    });
    if (fb.topics.length) units.push(fb);
  }

  const cleaned = units
    .filter((u) => u.topics.length)
    .map((u) => ({ ...u, topics: u.topics.slice(0, 15) }));
  const course =
    lines.find((l) => l.trim().length > 5 && !l.trim().match(unitRe))?.trim() ||
    "Academic Course";
  return {
    course,
    subject: "General",
    units: cleaned,
    totalTopics: cleaned.reduce((s, u) => s + u.topics.length, 0),
  };
}

/* ═══════════════════════════════ CONSTANTS ═══════════════════════════════ */
const DIFFS = [
  {
    id: "easy",
    emoji: "🌱",
    label: "Easy",
    col: "gr",
    desc: "Factual recall",
    tip: "1 sentence, direct",
  },
  {
    id: "medium",
    emoji: "🔥",
    label: "Medium",
    col: "ye",
    desc: "Reasoning required",
    tip: "2-3 sentences, logic",
  },
  {
    id: "hard",
    emoji: "⚡",
    label: "Hard",
    col: "re",
    desc: "Deep analysis",
    tip: "Paragraph, examples needed",
  },
];
const QTYPES = [
  {
    id: "mcq",
    icon: "⊙",
    label: "MCQ",
    long: "Multiple Choice",
    desc: "Pick best of 4 options",
  },
  {
    id: "short",
    icon: "◈",
    label: "Short Answer",
    long: "Short Answer",
    desc: "1-2 sentence response",
  },
  {
    id: "long",
    icon: "≡",
    label: "Long Answer",
    long: "Long Answer",
    desc: "Full analytical paragraph",
  },
];
// Question angles — AI will pick different conceptual frames
const Q_ANGLES = {
  mcq: [
    "factual recall about definition or mechanism",
    "application: apply the concept to a real-world scenario",
    "NOT-type: which of the following is NOT correct about",
    "comparison: which best distinguishes this from a related concept",
    "cause-effect: what happens when this concept is applied",
    "best-practice: what is the recommended approach regarding",
    "tricky: all options sound plausible, test deep understanding",
  ],
  short: [
    "define and give a concrete example",
    "explain why this concept matters in practice",
    "compare this with one closely related concept",
    "describe one real-world use case",
    "what problem does this concept solve?",
  ],
  long: [
    "detailed explanation with at least two examples",
    "critical analysis — advantages, disadvantages, and trade-offs",
    "step-by-step breakdown of how it works internally",
    "compare and contrast with at least two alternatives",
    "design a solution using this concept for a given problem scenario",
    "historical context, evolution, and modern significance",
  ],
};
const MOTIV = [
  "Every attempt sharpens your mind — the struggle IS the learning! 💪",
  "Wrong answers today become right answers tomorrow. Keep going! 🌱",
  "Every expert once stood exactly where you are. Push through! 🚀",
  "Your brain builds connections through effort, not just reading. 🧠",
  "A guess + reflection teaches more than skipping. Try! ⭐",
  "Mistakes are data. You're debugging your own understanding! 🔥",
];

/* ═══════════════════════════════ UI ATOMS ═══════════════════════════════ */
const Spin = ({ s = 20, c = "var(--gr)" }) => (
  <div
    style={{
      width: s,
      height: s,
      borderRadius: "50%",
      border: `2px solid var(--bd)`,
      borderTop: `2px solid ${c}`,
      animation: "spin .7s linear infinite",
      flexShrink: 0,
    }}
  />
);

const Pill = ({ children, color = "gr" }) => {
  const m = {
    gr: ["var(--gr2)", "var(--gr)"],
    ye: ["var(--ye2)", "var(--ye)"],
    re: ["var(--re2)", "var(--re)"],
    bl: ["var(--bl2)", "var(--bl)"],
    pu: ["var(--pu2)", "var(--pu)"],
    cy: ["var(--cy2)", "var(--cy)"],
    or: ["var(--or2)", "var(--or)"],
  };
  const [bg, fg] = m[color] || m.gr;
  return (
    <span
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${fg}40`,
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 10,
        fontFamily: "'IBM Plex Mono',monospace",
        fontWeight: 500,
        letterSpacing: ".06em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

const Btn = ({
  children,
  onClick,
  v = "pri",
  disabled,
  loading,
  full,
  sm,
  style: sx = {},
}) => {
  const vs = {
    pri: {
      background: "linear-gradient(135deg,#0fd9a0,#0cbf8a)",
      color: "#060b14",
      border: "none",
      fontWeight: 700,
    },
    sec: {
      background: "var(--c2)",
      color: "var(--tx)",
      border: "1px solid var(--bd)",
      fontWeight: 500,
    },
    ghost: {
      background: "var(--gr2)",
      color: "var(--gr)",
      border: "1px solid var(--gr3)",
      fontWeight: 600,
    },
    pur: {
      background: "var(--pu2)",
      color: "var(--pu)",
      border: "1px solid rgba(168,124,248,.3)",
      fontWeight: 600,
    },
    danger: {
      background: "var(--re2)",
      color: "var(--re)",
      border: "1px solid rgba(242,85,110,.3)",
      fontWeight: 600,
    },
    ye: {
      background: "var(--ye2)",
      color: "var(--ye)",
      border: "1px solid rgba(247,204,69,.3)",
      fontWeight: 600,
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...vs[v],
        padding: sm ? "7px 13px" : "11px 20px",
        fontSize: sm ? 12 : 13,
        borderRadius: 10,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        transition: "all .18s",
        letterSpacing: ".02em",
        ...(full ? { width: "100%" } : {}),
        lineHeight: 1,
        ...sx,
      }}
    >
      {loading && <Spin s={14} />}
      {children}
    </button>
  );
};

const Card = ({ children, style: sx = {}, accent, glow }) => (
  <div
    style={{
      background: "var(--c1)",
      border: `1px solid ${accent ? accent + "45" : "var(--bd)"}`,
      borderRadius: 14,
      padding: 20,
      position: "relative",
      overflow: "hidden",
      ...(glow ? { boxShadow: `0 0 30px ${accent || "var(--gr)"}22` } : {}),
      ...sx,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "8%",
        right: "8%",
        height: 1,
        background: accent
          ? `linear-gradient(90deg,transparent,${accent}70,transparent)`
          : "linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent)",
      }}
    />
    {children}
  </div>
);

const M = ({ children, style: sx = {} }) => (
  <span style={{ fontFamily: "'IBM Plex Mono',monospace", ...sx }}>
    {children}
  </span>
);
const ML = ({ children, c = "var(--t3)" }) => (
  <M
    style={{
      fontSize: 10,
      color: c,
      letterSpacing: ".1em",
      display: "block",
      marginBottom: 12,
    }}
  >
    {children}
  </M>
);

const Track = ({ val, color, height = 5 }) => (
  <div
    style={{
      height,
      background: "var(--c3)",
      borderRadius: 3,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${Math.min(100, Math.max(0, val))}%`,
        background: color || "var(--gr)",
        borderRadius: 3,
        transition: "width .9s ease",
      }}
    />
  </div>
);

// SVG ring progress for Unit Mastery cards
const Ring = ({
  val = 0,
  size = 80,
  stroke = 6,
  color = "var(--gr)",
  label,
  sub,
}) => {
  const r = (size - stroke * 2) / 2,
    circ = 2 * Math.PI * r;
  const offset = val > 0 ? circ - (val / 100) * circ : circ;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bd)"
          strokeWidth={stroke}
        />
        {val > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
            }}
          />
        )}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={val > 0 ? color : "var(--t3)"}
          fontSize={size * 0.19}
          fontWeight="700"
          fontFamily="IBM Plex Mono"
        >
          {val > 0 ? `${val}%` : "—"}
        </text>
        {sub && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--t3)"
            fontSize={size * 0.12}
            fontFamily="IBM Plex Mono"
          >
            {sub}
          </text>
        )}
      </svg>
      {label && (
        <span
          style={{
            fontSize: 10,
            color: "var(--t2)",
            fontFamily: "'IBM Plex Mono',monospace",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: size + 8,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

const sc = (v) => (v >= 75 ? "var(--gr)" : v >= 50 ? "var(--ye)" : "var(--re)");
const dc = (d) =>
  ({ easy: "var(--gr)", medium: "var(--ye)", hard: "var(--re)" })[d] ||
  "var(--gr)";

/* ═══════════════════════════════ TRY-FIRST MODAL ═══════════════════════════════ */
function TryFirstModal({ onStay, onSkip }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,11,20,.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      className="fade"
    >
      <Card
        accent="var(--ye)"
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 32,
          textAlign: "center",
        }}
        className="pop"
      >
        <div style={{ fontSize: 52, marginBottom: 12 }}>🧠</div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          Have you tried your best?
        </h3>
        <p
          style={{
            color: "var(--t2)",
            fontSize: 14,
            lineHeight: 1.75,
            fontFamily: "Lora,serif",
            fontStyle: "italic",
            marginBottom: 8,
          }}
        >
          Even if you don't know the answer — make your best guess or write
          something.
        </p>
        <p
          style={{
            color: "var(--ye)",
            fontSize: 12,
            fontFamily: "'IBM Plex Mono',monospace",
            marginBottom: 24,
            padding: "10px 14px",
            background: "var(--ye2)",
            borderRadius: 8,
            border: "1px solid rgba(247,204,69,.25)",
          }}
        >
          ⚡ A wrong attempt + seeing the correct answer builds{" "}
          <strong>3× more memory</strong> than skipping.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn onClick={onStay} full style={{ padding: 13, fontSize: 14 }}>
            ← Let Me Try! (Recommended)
          </Btn>
          <Btn v="sec" onClick={onSkip} full sm>
            I truly don't know — Skip to new question
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════ LANDING ═══════════════════════════════ */
function Landing({ onEnter }) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState("");
  const feats = [
    [
      "🧠",
      "Instant Knowledge Map",
      "Syllabus parsed locally — no API needed, works offline",
    ],
    [
      "🎯",
      "3 Difficulty Levels",
      "Easy → Medium → Hard with randomised question angles",
    ],
    [
      "📝",
      "MCQ + Short + Long",
      "3 question types with 5–7 random variants each",
    ],
    [
      "💡",
      "Smart Hint Engine",
      "AI-powered personalised hints when score drops below 50%",
    ],
    [
      "📊",
      "Mastery Dashboard",
      "SVG ring charts, difficulty heatmap & full activity log",
    ],
    [
      "🏆",
      "Full Result Reports",
      "Rubric scoring, model answers & gap analysis",
    ],
  ];
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse at 20% 40%,rgba(15,217,160,.06) 0%,transparent 55%),radial-gradient(ellipse at 80% 60%,rgba(79,142,245,.05) 0%,transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--bd) 1px,transparent 1px),linear-gradient(90deg,var(--bd) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
          opacity: 0.15,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 980,
        }}
        className="fu"
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              background: "var(--c1)",
              border: "1px solid var(--bd)",
              borderRadius: 100,
              marginBottom: 22,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--gr)",
                animation: "pulse 2s infinite",
              }}
            />
            <M
              style={{
                fontSize: 10,
                color: "var(--gr)",
                letterSpacing: ".1em",
              }}
            >
              AI-POWERED ACADEMIC INTELLIGENCE
            </M>
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.04,
              marginBottom: 14,
            }}
          >
            Syllabus
            <span
              style={{
                background: "linear-gradient(135deg,#0fd9a0,#25d8f0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Mastery
            </span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--t2)",
              fontFamily: "Lora,serif",
              fontStyle: "italic",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Upload any syllabus — PDF, TXT, or paste text. AI maps every concept
            and tests your depth with randomised questions.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <Card accent="var(--gr)" style={{ padding: 26 }} glow>
            <ML>— SIGN IN TO START</ML>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Your full name", name, setName],
                ["Email address", email, setEmail],
              ].map(([ph, v, fn]) => (
                <input
                  key={ph}
                  placeholder={ph}
                  value={v}
                  onChange={(e) => fn(e.target.value)}
                  style={{
                    background: "var(--c2)",
                    border: "1px solid var(--bd)",
                    borderRadius: 9,
                    padding: "12px 14px",
                    color: "var(--tx)",
                    fontSize: 14,
                    width: "100%",
                    transition: "border .2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.border = "1px solid var(--gr)")
                  }
                  onBlur={(e) =>
                    (e.target.style.border = "1px solid var(--bd)")
                  }
                />
              ))}
              <Btn
                onClick={() =>
                  onEnter({ name: name.trim(), email: email.trim() })
                }
                disabled={!name.trim() || !email.trim()}
                full
                style={{ marginTop: 4, padding: 13, fontSize: 14 }}
              >
                Launch Platform →
              </Btn>
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {[
                "PDF Upload",
                "TXT/MD",
                "MCQ",
                "Short Q&A",
                "Long Answer",
                "AI Hints",
                "Ring Charts",
              ].map((f) => (
                <Pill key={f} color="gr">
                  {f}
                </Pill>
              ))}
            </div>
          </Card>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {feats.map(([ic, ti, bo], i) => (
              <div
                key={ti}
                style={{
                  background: "var(--c1)",
                  border: "1px solid var(--bd)",
                  borderRadius: 11,
                  padding: "14px 16px",
                  animation: `fu .5s ${i * 0.07}s both`,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{ic}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {ti}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--t3)",
                    fontFamily: "'IBM Plex Mono',monospace",
                    lineHeight: 1.45,
                  }}
                >
                  {bo}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ UPLOAD ═══════════════════════════════ */
function Upload({ onDone }) {
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null);
  const [err, setErr] = useState(""),
    [uploadProg, setUploadProg] = useState(0),
    [uploadName, setUploadName] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const SAMPLE = `Computer Science — Operating Systems (BCA Semester IV)

Unit 1: Introduction to Operating Systems
- Definition and Functions of OS
- Types: Batch, Time-Sharing, Real-Time, Distributed
- Process Management and Process States
- CPU Scheduling: FCFS, SJF, Round Robin, Priority
- Deadlock: Detection, Prevention, Avoidance

Unit 2: Memory Management
- Logical vs Physical Address Space
- Paging, Segmentation, and Page Tables
- Virtual Memory and Demand Paging
- Page Replacement: FIFO, LRU, Optimal, Clock
- Thrashing and Working Set Model

Unit 3: File Systems
- File Concepts and Access Methods
- Directory Structure and Path Resolution
- File Allocation: Contiguous, Linked, Indexed
- Disk Scheduling: FCFS, SSTF, SCAN, C-SCAN

Unit 4: Process Synchronization
- Critical Section Problem and Race Conditions
- Semaphores: Binary and Counting
- Classic Problems: Producer-Consumer, Readers-Writers
- Dining Philosophers Problem
- Monitors and Condition Variables

Unit 5: Security and Protection
- System Security Threats and Attacks
- Authentication: Passwords, Biometrics, MFA
- Access Control: ACL, Capability Lists
- Encryption: Symmetric, Asymmetric, Hashing`;

  const loadPDF = async (file) => {
    setUploadName(file.name);
    setUploadProg(10);
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = res;
        s.onerror = () => rej(new Error("PDF library failed to load"));
        document.head.appendChild(s);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    setUploadProg(30);
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let out = "";
    const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it) => it.str).join(" ") + "\n";
      setUploadProg(30 + Math.floor((i / total) * 60));
    }
    setUploadProg(100);
    return out;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processFile = useCallback(async (file) => {
    if (!file) return;
    setErr("");
    setUploadProg(5);
    setUploadName(file.name);
    try {
      let content = "";
      if (file.name.toLowerCase().endsWith(".pdf")) {
        content = await loadPDF(file);
      } else {
        await new Promise((res) => setTimeout(res, 200));
        setUploadProg(50);
        content = await file.text();
        setUploadProg(100);
      }
      setText(content);
      setUploadProg(0);
    } catch (e) {
      setErr("File read error: " + e.message);
      setUploadProg(0);
    }
  });

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile],
  );

  const parse = () => {
    setErr("");
    if (!text.trim()) {
      setErr("Please paste your syllabus or upload a file.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      try {
        const result = parseSyllabus(text);
        if (!result || !result.units.length) {
          setErr(
            "No topics found. Make sure your text has unit headings and topic lines.",
          );
          setBusy(false);
          return;
        }
        setPreview(result);
      } catch (e) {
        setErr("Parse error: " + e.message);
      }
      setBusy(false);
    }, 80);
  };

  return (
    <div
      style={{ maxWidth: 740, margin: "0 auto", padding: 32 }}
      className="fu"
    >
      <Pill color="gr">STEP 01 · SYLLABUS UPLOAD</Pill>
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginTop: 10,
          marginBottom: 6,
        }}
      >
        Upload Your Syllabus
      </h2>
      <p
        style={{
          color: "var(--t2)",
          fontFamily: "Lora,serif",
          fontStyle: "italic",
          fontSize: 15,
          marginBottom: 22,
        }}
      >
        Upload PDF, TXT, MD — or paste any syllabus text. Parsed instantly, no
        AI required.
      </p>

      {!preview ? (
        <>
          {/* File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${drag ? "var(--gr)" : "var(--bd)"}`,
              borderRadius: 12,
              padding: "22px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: drag ? "var(--gr2)" : "var(--c1)",
              transition: "all .2s",
              marginBottom: 14,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.pdf,.text"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) processFile(f);
                e.target.value = "";
              }}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {drag ? "📂" : "📁"}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: drag ? "var(--gr)" : "var(--tx)",
                marginBottom: 4,
              }}
            >
              {uploadName
                ? `Loaded: ${uploadName}`
                : "Drop file here or click to browse"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--t3)",
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              Accepts .pdf · .txt · .md · any text file
            </div>
            {uploadProg > 0 && uploadProg < 100 && (
              <div style={{ marginTop: 12 }}>
                <Track val={uploadProg} color="var(--cy)" height={3} />
                <M
                  style={{
                    fontSize: 10,
                    color: "var(--cy)",
                    display: "block",
                    marginTop: 4,
                  }}
                >
                  Reading file... {uploadProg}%
                </M>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
            <M style={{ fontSize: 10, color: "var(--t3)" }}>OR PASTE TEXT</M>
            <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
          </div>

          <Card style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <ML>SYLLABUS TEXT</ML>
              <button
                onClick={() => setText(SAMPLE)}
                style={{
                  background: "var(--cy2)",
                  border: "1px solid rgba(37,216,240,.3)",
                  color: "var(--cy)",
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono',monospace",
                  cursor: "pointer",
                }}
              >
                Load Sample ↓
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setErr("");
              }}
              placeholder={
                "Unit 1: Introduction\n- Topic A\n- Topic B\n\nUnit 2: Advanced\n- Topic C"
              }
              style={{
                width: "100%",
                minHeight: 260,
                background: "var(--c2)",
                border: "1px solid var(--bd)",
                borderRadius: 9,
                padding: 16,
                color: "var(--tx)",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                lineHeight: 1.7,
                resize: "vertical",
                display: "block",
              }}
              onFocus={(e) => (e.target.style.border = "1px solid var(--gr)")}
              onBlur={(e) => (e.target.style.border = "1px solid var(--bd)")}
            />
            {err && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "var(--re2)",
                  borderRadius: 8,
                  border: "1px solid rgba(242,85,110,.3)",
                }}
              >
                <p
                  style={{
                    color: "var(--re)",
                    fontSize: 12,
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}
                >
                  ⚠ {err}
                </p>
              </div>
            )}
            <M
              style={{
                fontSize: 10,
                color: "var(--t3)",
                display: "block",
                marginTop: 8,
              }}
            >
              {text.length} chars · {text.split(/\s+/).filter(Boolean).length}{" "}
              words
            </M>
          </Card>

          <Btn
            onClick={parse}
            disabled={!text.trim()}
            loading={busy}
            full
            style={{ padding: 14, fontSize: 14 }}
          >
            {busy ? "Parsing..." : "⚡ Build Knowledge Map & Start Assessment"}
          </Btn>
        </>
      ) : (
        <div className="fu">
          <Card accent="var(--gr)" style={{ marginBottom: 14 }} glow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div>
                <ML c="var(--gr)">✓ PARSED SUCCESSFULLY</ML>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
                  {preview.course}
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Pill color="cy">{preview.units.length} units</Pill>
                  <Pill color="bl">{preview.totalTopics} topics</Pill>
                  <Pill color="gr">Ready to assess</Pill>
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--t3)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono',monospace",
                }}
              >
                ← Re-upload
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {preview.units.map((u) => (
                <div key={u.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <M
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--gr)",
                      }}
                    >
                      {u.name}
                    </M>
                    <Pill color="bl">{u.topics.length} topics</Pill>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      paddingLeft: 8,
                    }}
                  >
                    {u.topics.map((t) => (
                      <span
                        key={t.id}
                        style={{
                          fontSize: 11,
                          color: "var(--t2)",
                          background: "var(--c2)",
                          border: "1px solid var(--bd)",
                          padding: "3px 9px",
                          borderRadius: 5,
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={() => onDone(preview)}
              full
              style={{ padding: 14, fontSize: 14 }}
            >
              🚀 Looks Good — Start Assessment →
            </Btn>
            <Btn
              v="sec"
              onClick={() => setPreview(null)}
              style={{ flexShrink: 0 }}
            >
              ← Edit
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════ ADVANCED LOCAL QUESTION ENGINE ═════════════ */

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function generateDistractors(topic) {
  const words = topic.name.split(" ");
  const core = words[0];

  return shuffleArray([
    `${core} optimization technique`,
    `${core} hardware abstraction layer`,
    `Legacy ${core} replacement model`,
    `${core} static configuration method`,
    `${core} deprecated architecture`
  ]);
}

function generateLocalQuestion(topic, diff, qtype, angle) {
  const name = topic.name;
  const unit = topic.unitName;

  const difficultyWeight = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  const complexity = difficultyWeight[diff] || 2;

  if (qtype === "mcq") {
  const distractors = generateDistractors(topic);

  let correctStatement;

  if (angle.includes("NOT")) {
    correctStatement = `${name} does NOT eliminate the need for core system management in ${unit}.`;
  } else if (angle.includes("application")) {
    correctStatement = `${name} can be applied to optimize or control real-world processes in ${unit}.`;
  } else if (angle.includes("comparison")) {
    correctStatement = `${name} differs from similar concepts by its structural role in ${unit}.`;
  } else if (angle.includes("cause-effect")) {
    correctStatement = `Using ${name} directly impacts system performance in ${unit}.`;
  } else {
    correctStatement = `${name} is a foundational concept within ${unit}.`;
  }

  const optionsPool = shuffleArray([
    correctStatement,
    ...distractors.slice(0, 3)
  ]);

  const correctIndex = optionsPool.indexOf(correctStatement);

  return {
    question: `From the perspective of ${angle}, which statement best explains ${name}?`,
    options: {
      A: optionsPool[0],
      B: optionsPool[1],
      C: optionsPool[2],
      D: optionsPool[3]
    },
    correct: ["A", "B", "C", "D"][correctIndex],
    explanation: `${name} is conceptually tied to ${unit} and affects system-level behavior.`,
    difficulty: diff
  };
}

  if (qtype === "short") {
    return {
      question:
        complexity === 1
          ? `Define ${name}.`
          : complexity === 2
            ? `Using ${angle}, define ${name}.`
            : `Explain ${name} and analyze why it is critical in system-level design within ${unit}.`,
      keyPoints: [
        "Clear definition",
        "How it works",
        "Real-world example",
        "Limitation or trade-off"
      ],
      sampleAnswer: `${name} is a key concept in ${unit} that helps structure or manage system processes effectively.`,
      difficulty: diff
    };
  }

  return {
    question:
      complexity === 1
        ? `Explain the basic idea behind ${name}.`
        : complexity === 2
          ? `Using the angle of ${angle}, critically analyze ${name}.`
          : `Critically analyze ${name}, discussing mechanism, trade-offs, and architectural implications.`,
    keyPoints: [
      "Precise definition",
      "Internal mechanism",
      "Practical example",
      "Advantages",
      "Limitations"
    ],
    sampleAnswer: `${name} plays a significant role in ${unit}. It works by managing system-level operations and influencing performance characteristics.`,
    difficulty: diff
  };
}

/* ═══════════════════════════════ ASSESSMENT ═══════════════════════════════ */
function Assessment({
  syllabus,
  scores,
  setScores,
  history,
  setHistory,
  onDashboard,
}) {
  const [step, setStep] = useState("pick");
  const [topic, setTopic] = useState(null);
  const [diff, setDiff] = useState("medium");
  const [qtype, setQtype] = useState("mcq");
  const [qdata, setQdata] = useState(null);
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [qCount, setQCount] = useState(0); // how many questions generated this session
  const [tryModal, setTryModal] = useState(false); // "Try First" popup
  const [angleIdx, setAngleIdx] = useState(0); // rotates through Q_ANGLES
  const [motivMsg] = useState(
    () => MOTIV[Math.floor(Math.random() * MOTIV.length)],
  );
  
  const allTopics =
  syllabus.units?.flatMap((u) =>
    u.topics.map((t) => ({ ...t, unitName: u.name })),
) || [];
  const doneCount = allTopics.filter((t) => scores[t.id] !== undefined).length;
  const reset = () => {
    setQdata(null);
    setAnswer("");
    setChoice(null);
    setResult(null);
    setHint(null);
  };

  /* ─── GENERATE QUESTION ─── */
const generate = (forcedDiff) => {
  const prevScore = scores[topic.id];

  let adaptiveDiff = forcedDiff || diff;

  if (prevScore !== undefined) {
    if (prevScore < 50) adaptiveDiff = "easy";
    else if (prevScore < 75) adaptiveDiff = "medium";
    else adaptiveDiff = "hard";
  }

  setDiff(adaptiveDiff);

  reset();
  setBusy(true);
  setBusyMsg("Generating question...");

  const angles = Q_ANGLES[qtype] || [];

  let randomAngleIndex;
  do {
    randomAngleIndex = Math.floor(Math.random() * angles.length);
  } while (randomAngleIndex === angleIdx && angles.length > 1);

  // IMPORTANT: store locally
  const selectedAngle = angles[randomAngleIndex] || angles[0];

  // update state AFTER selecting
  setAngleIdx(randomAngleIndex);

  setTimeout(() => {
    const q = generateLocalQuestion(
      topic,
      adaptiveDiff,
      qtype,
      selectedAngle
    );

    setQdata(q);
    setQCount((c) => c + 1);
    setStep("question");
    setBusy(false);
  }, 400);
};

  /* ─── EVALUATE ─── */
  const evaluate = async () => {
    const userAns =
      qtype === "mcq"
        ? `Selected (${choice}): ${qdata.options?.[choice] || ""}`
        : answer.trim();
    if (!userAns) return;
    setBusy(true);
    setBusyMsg("Evaluating your answer...");
    try {
      let ev;
      if (qtype === "mcq") {
        const correct = choice === qdata.correct;
        const base = correct
          ? diff === "easy"
            ? 84
            : diff === "medium"
              ? 87
              : 92
          : diff === "easy"
            ? 12
            : diff === "medium"
              ? 10
              : 8;
        const overall = Math.max(
          5,
          Math.min(100, base + Math.floor(Math.random() * 8) - 4),
        );
        ev = {
          type: "mcq",
          correct,
          chosen: choice,
          chosenText: qdata.options?.[choice] || "",
          correctKey: qdata.correct,
          correctText: qdata.options?.[qdata.correct] || "",
          explanation: qdata.explanation || "",
          scores: {
            Accuracy: correct ? 96 : 5,
            Understanding: correct ? overall : 22,
            Application: correct ? overall - 5 : 15,
          },
          overall,
          verdict: correct
            ? diff === "hard"
              ? "Excellent"
              : "Good"
            : "Insufficient",
          feedback: correct
            ? `Correct! ${qdata.explanation}`
            : `The correct answer is (${qdata.correct}) "${qdata.options?.[qdata.correct]}". ${qdata.explanation}`,
          strengths: correct
            ? ["Correct answer identified", "Strong conceptual awareness"]
            : [],
          improvements: correct
            ? []
            : [
              "Review fundamentals of " + topic.name,
              "Study why (" + qdata.correct + ") is definitively correct",
            ],
          gap: correct
            ? null
            : `Core gap in: ${topic.name} — understand why "${qdata.options?.[qdata.correct]}" is correct.`,
          modelPoints: [],
        };
      } else {
        const wc = userAns.split(/\s+/).filter(Boolean).length;
        const keywords = topic.name.toLowerCase().split(" ");

        let keywordHits = 0;
        keywords.forEach(k => {
          if (userAns.toLowerCase().includes(k)) keywordHits++;
        });

        let baseScore = wc * 2 + keywordHits * 10;

        if (diff === "hard") baseScore *= 0.8;
        if (diff === "easy") baseScore *= 1.2;

        const score = Math.max(15, Math.min(95, Math.round(baseScore)));

        ev = {
          type: "open",
          scores: {
            Accuracy: score,
            Depth: Math.max(10, score - 10),
            Clarity: score,
            Application: Math.max(10, score - 15),
            Completeness: Math.max(10, score - 12)
          },
          overall: score,
          verdict:
            score >= 80
              ? "Excellent"
              : score >= 65
                ? "Good"
                : score >= 45
                  ? "Developing"
                  : "Insufficient",
          feedback:
            score >= 75
              ? "Strong conceptual clarity and structured explanation."
              : "Improve precision, add clearer mechanism explanation and examples.",
          strengths:
            keywordHits > 0
              ? ["Used core terminology", "Relevant explanation"]
              : ["Attempted response"],
          improvements: [
            "Use more technical vocabulary",
            "Add concrete example",
            "Explain internal mechanism clearly"
          ],
          gap:
            score < 50
              ? "Conceptual depth and technical clarity need improvement."
              : null,
          modelPoints: qdata.keyPoints || []
        };
      }
      setScores((p) => ({
        ...p,
        [topic.id]: Math.max(p[topic.id] || 0, ev.overall),
      }));
      setHistory((p) => [
        {
          topicId: topic.id,
          topic: topic.name,
          unit: topic.unitName,
          score: ev.overall,
          verdict: ev.verdict,
          diff,
          qtype,
          ts: new Date().toLocaleTimeString(),
        },
        ...p.slice(0, 49),
      ]);
      if (ev.overall >= 65) setStreak((s) => s + 1);
      else setStreak(0);
      setResult(ev);
      setStep("result");
    } catch (e) {
      alert("Evaluation error: " + e.message + "\nPlease retry.");
    }
    setBusy(false);
  };

  /* ─── HINT ─── */
  const getHint = () => {
    if (hint) return;
    setHint(
      `Focus on the core definition of "${topic.name}". 
Think about what problem it solves and how it works internally.`
    );
  };

  /* ─── NEW Q with Try-First gate ─── */
  const handleNewQ = () => {
    const hasAnswer = qtype === "mcq" ? !!choice : answer.trim().length > 0;
    if (!hasAnswer) {
      setTryModal(true);
    } else {
      generate();
    }
  };

  const vc = {
    Excellent: "var(--gr)",
    Good: "var(--cy)",
    Developing: "var(--ye)",
    Insufficient: "var(--re)",
  };
  const ve = {
    Excellent: "🏆",
    Good: "✅",
    Developing: "📈",
    Insufficient: "💡",
  };

  /* ══ PICK TOPIC ══ */
  if (step === "pick")
    return (
      <div
        style={{ padding: 28, maxWidth: 980, margin: "0 auto" }}
        className="fu"
      >
        {tryModal && (
          <TryFirstModal
            onStay={() => setTryModal(false)}
            onSkip={() => {
              setTryModal(false);
              generate();
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <Pill color="gr">ASSESSMENT ENGINE</Pill>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              Choose a Topic to Test
            </h2>
            <p
              style={{
                color: "var(--t2)",
                fontFamily: "Lora,serif",
                fontStyle: "italic",
                fontSize: 14,
              }}
            >
              Click any topic → set difficulty & type → AI generates a unique
              randomised question.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {doneCount >= 3 && (
              <Btn v="ghost" onClick={onDashboard} sm>
                📊 Dashboard
              </Btn>
            )}
            <Pill color="cy">
              {doneCount}/{allTopics.length} assessed
            </Pill>
            {streak > 1 && <Pill color="ye">🔥 {streak} streak</Pill>}
          </div>
        </div>

        {syllabus.units?.map((unit) => {
          const unitTopics = unit.topics;
          const unitDone = unitTopics.filter(
            (t) => scores[t.id] !== undefined,
          ).length;
          const unitPct = unitTopics.length
            ? Math.round((unitDone / unitTopics.length) * 100)
            : 0;
          return (
            <div key={unit.id} style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <M
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--gr)",
                    letterSpacing: ".07em",
                  }}
                >
                  {unit.name.toUpperCase()}
                </M>
                <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
                <M
                  style={{
                    fontSize: 10,
                    color: unitDone > 0 ? "var(--gr)" : "var(--t3)",
                  }}
                >
                  {unitDone}/{unitTopics.length} done
                </M>
                {unitDone > 0 && (
                  <div style={{ width: 60 }}>
                    <Track val={unitPct} color={sc(unitPct)} height={3} />
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                  gap: 9,
                }}
              >
                {unit.topics.map((t) => {
                  const s = scores[t.id],
                    done = s !== undefined;
                  const topicAttempts = history.filter(
                    (h) => h.topicId === t.id,
                  ).length;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setTopic({ ...t, unitName: unit.name });
                        reset();
                        setStep("configure");
                      }}
                      style={{
                        background: "var(--c1)",
                        border: `1px solid ${done ? sc(s) + "50" : "var(--bd)"}`,
                        borderRadius: 11,
                        padding: "13px 14px",
                        cursor: "pointer",
                        transition: "all .2s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = done
                          ? sc(s)
                          : "var(--gr)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = done
                          ? sc(s) + "50"
                          : "var(--bd)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.35,
                            flex: 1,
                            color: "var(--tx)",
                          }}
                        >
                          {t.name}
                        </span>
                        {done && (
                          <M
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: sc(s),
                              marginLeft: 6,
                              flexShrink: 0,
                            }}
                          >
                            {s}%
                          </M>
                        )}
                      </div>
                      {/* Difficulty bars */}
                      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 2,
                              background:
                                i <= (t.difficulty || 2)
                                  ? dc(
                                    [
                                      "easy",
                                      "easy",
                                      "medium",
                                      "hard",
                                      "hard",
                                    ][i - 1],
                                  )
                                  : "var(--bd)",
                            }}
                          />
                        ))}
                      </div>
                      {/* Progress bar — only fills for completed topics */}
                      {done ? (
                        <Track val={s} color={sc(s)} height={4} />
                      ) : (
                        <div
                          style={{
                            height: 4,
                            background: "var(--c3)",
                            borderRadius: 3,
                            border: "1px dashed var(--bd)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 5,
                        }}
                      >
                        <M style={{ fontSize: 9, color: "var(--t3)" }}>
                          {done
                            ? `${topicAttempts} attempt${topicAttempts !== 1 ? "s" : ""}  ●  Best: ${s}%`
                            : "Not assessed yet"}
                        </M>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );

  /* ══ CONFIGURE ══ */
  if (step === "configure" && topic)
    return (
      <div
        style={{ maxWidth: 700, margin: "0 auto", padding: 28 }}
        className="fu"
      >
        <button
          onClick={() => setStep("pick")}
          style={{
            background: "none",
            border: "none",
            color: "var(--t2)",
            cursor: "pointer",
            fontSize: 13,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          ← All Topics
        </button>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <Pill color="cy">{topic.unitName}</Pill>
          {scores[topic.id] !== undefined && (
            <Pill
              color={
                scores[topic.id] >= 75
                  ? "gr"
                  : scores[topic.id] >= 50
                    ? "ye"
                    : "re"
              }
            >
              Best: {scores[topic.id]}%
            </Pill>
          )}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}
        >
          {topic.name}
        </h2>
        {topic.learningObjective && (
          <p
            style={{
              color: "var(--t2)",
              fontFamily: "Lora,serif",
              fontStyle: "italic",
              fontSize: 14,
              marginBottom: 22,
            }}
          >
            {topic.learningObjective}
          </p>
        )}
        {!topic.learningObjective && <div style={{ marginBottom: 22 }} />}

        {/* Difficulty */}
        <Card style={{ marginBottom: 12 }}>
          <ML>① SELECT DIFFICULTY</ML>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            {DIFFS.map((d) => {
              const sel = diff === d.id,
                col = dc(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => setDiff(d.id)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 11,
                    cursor: "pointer",
                    border: `2px solid ${sel ? col : "var(--bd)"}`,
                    background: sel ? col + "15" : "var(--c2)",
                    transition: "all .2s",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{d.emoji}</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: sel ? col : "var(--t2)",
                      marginBottom: 3,
                    }}
                  >
                    {d.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--t3)",
                      fontFamily: "'IBM Plex Mono',monospace",
                      lineHeight: 1.35,
                    }}
                  >
                    {d.desc}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      padding: "3px 8px",
                      background: sel ? col + "22" : "var(--c3)",
                      borderRadius: 5,
                      display: "inline-block",
                    }}
                  >
                    <M style={{ fontSize: 9, color: sel ? col : "var(--t3)" }}>
                      {d.tip}
                    </M>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Question Type */}
        <Card style={{ marginBottom: 18 }}>
          <ML>② SELECT QUESTION TYPE</ML>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {QTYPES.map((qt) => {
              const sel = qtype === qt.id;
              return (
                <div
                  key={qt.id}
                  onClick={() => setQtype(qt.id)}
                  style={{
                    padding: "13px 16px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `1px solid ${sel ? "var(--gr)" : "var(--bd)"}`,
                    background: sel ? "var(--gr2)" : "var(--c2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "all .18s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      color: sel ? "var(--gr)" : "var(--t3)",
                      flexShrink: 0,
                      width: 26,
                      textAlign: "center",
                    }}
                  >
                    {qt.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: sel ? "var(--tx)" : "var(--t2)",
                        marginBottom: 2,
                      }}
                    >
                      {qt.long}
                    </div>
                    <M style={{ fontSize: 11, color: "var(--t3)" }}>
                      {qt.desc}
                    </M>
                  </div>
                  {sel && (
                    <div
                      style={{
                        padding: "3px 10px",
                        background: "var(--gr2)",
                        border: "1px solid var(--gr3)",
                        borderRadius: 20,
                      }}
                    >
                      <M style={{ fontSize: 10, color: "var(--gr)" }}>
                        ✓ Selected
                      </M>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div
          style={{
            padding: "10px 14px",
            background: "var(--c2)",
            borderRadius: 9,
            border: "1px solid var(--bd)",
            marginBottom: 14,
          }}
        >
          <M style={{ fontSize: 11, color: "var(--t2)" }}>
            🎲 Questions are{" "}
            <strong style={{ color: "var(--gr)" }}>randomised</strong> — each
            attempt uses a different angle and seed for maximum variety.
          </M>
        </div>

        <Btn
          onClick={() => generate()}
          disabled={busy}
          loading={busy}
          full
          style={{ padding: 14, fontSize: 14 }}
        >
          {busy
            ? busyMsg
            : `🎯 Generate ${QTYPES.find((q) => q.id === qtype)?.long}`}
        </Btn>
      </div>
    );

  /* ══ LOADING ══ */
  if (busy && !result)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 420,
          gap: 16,
        }}
      >
        <Spin s={38} />
        <M style={{ fontSize: 13, color: "var(--t2)" }}>{busyMsg}</M>
        <M style={{ fontSize: 10, color: "var(--t3)" }}>
          Using random angle #{angleIdx + 1} for maximum variety
        </M>
      </div>
    );

  /* ══ QUESTION ══ */
  if (step === "question" && qdata) {
    const hasAnswer = qtype === "mcq" ? !!choice : answer.trim().length > 0;
    return (
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: 28 }}
        className="fu"
      >
        {tryModal && (
          <TryFirstModal
            onStay={() => setTryModal(false)}
            onSkip={() => {
              setTryModal(false);
              generate();
            }}
          />
        )}

        {/* Header bar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Pill
            color={diff === "easy" ? "gr" : diff === "medium" ? "ye" : "re"}
          >
            {DIFFS.find((d) => d.id === diff)?.emoji} {diff.toUpperCase()}
          </Pill>
          <Pill color="cy">{QTYPES.find((q) => q.id === qtype)?.long}</Pill>
          <Pill color="bl">{topic?.name}</Pill>
          <div style={{ flex: 1 }} />
          <M style={{ fontSize: 10, color: "var(--t3)" }}>Q #{qCount}</M>
          <button
            onClick={() => setStep("configure")}
            style={{
              background: "none",
              border: "none",
              color: "var(--t3)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono',monospace",
            }}
          >
            ← Settings
          </button>
        </div>

        {/* Two-panel layout on wider view */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {/* Question */}
          <Card accent="var(--gr)" glow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <ML c="var(--gr)">QUESTION</ML>
              <div style={{ display: "flex", gap: 6 }}>
                <M
                  style={{
                    fontSize: 9,
                    color: "var(--t3)",
                    padding: "2px 7px",
                    background: "var(--c2)",
                    borderRadius: 5,
                    border: "1px solid var(--bd)",
                  }}
                >
                  angle #{angleIdx + 1}
                </M>
              </div>
            </div>
            <p
              style={{
                fontSize: 15,
                fontFamily: "Lora,serif",
                lineHeight: 1.85,
                color: "var(--tx)",
              }}
            >
              {qdata.question}
            </p>
            {qtype === "long" && qdata.subParts?.filter(Boolean).length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid var(--bd)",
                }}
              >
                {qdata.subParts.filter(Boolean).map((sp, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", gap: 8, marginBottom: 6 }}
                  >
                    <M
                      style={{
                        color: "var(--cy)",
                        fontSize: 12,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {String.fromCharCode(65 + i)}.
                    </M>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--t2)",
                        fontFamily: "Lora,serif",
                        fontStyle: "italic",
                      }}
                    >
                      {sp.replace(/^\([a-z]\)\s*/i, "")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* MCQ Options */}
          {qtype === "mcq" && qdata.options && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ML>SELECT YOUR ANSWER</ML>
              {Object.entries(qdata.options).map(([k, v]) => {
                const sel = choice === k;
                return (
                  <div
                    key={k}
                    onClick={() => setChoice(k)}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 11,
                      cursor: "pointer",
                      border: `2px solid ${sel ? "var(--gr)" : "var(--bd)"}`,
                      background: sel ? "var(--gr2)" : "var(--c1)",
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      transition: "all .18s",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: sel ? "var(--gr)" : "var(--c3)",
                        border: `1px solid ${sel ? "var(--gr)" : "var(--bd)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all .18s",
                      }}
                    >
                      <M
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: sel ? "#060b14" : "var(--t3)",
                        }}
                      >
                        {k}
                      </M>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        color: sel ? "var(--tx)" : "var(--t2)",
                        lineHeight: 1.5,
                        paddingTop: 4,
                      }}
                    >
                      {v}
                    </span>
                    {sel && (
                      <span
                        style={{
                          position: "absolute",
                          right: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--gr)",
                          fontSize: 18,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Answer */}
          {(qtype === "short" || qtype === "long") && (
            <Card>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <ML>{qtype === "short" ? "YOUR ANSWER" : "YOUR ANSWER"}</ML>
                <M style={{ fontSize: 10, color: "var(--t3)" }}>
                  {qtype === "short"
                    ? "Target: 1-2 sentences"
                    : "Target: 4-8 sentences, include examples"}
                </M>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  qtype === "short"
                    ? "Write a precise 1-2 sentence answer with a key term or definition..."
                    : "Write a detailed analytical answer. Define the concept, explain how it works, give real-world examples, discuss trade-offs..."
                }
                style={{
                  width: "100%",
                  minHeight: qtype === "long" ? 190 : 100,
                  background: "var(--c2)",
                  border: "1px solid var(--bd)",
                  borderRadius: 9,
                  padding: 14,
                  color: "var(--tx)",
                  fontFamily: "Lora,serif",
                  fontSize: 14,
                  lineHeight: 1.8,
                  resize: "vertical",
                  display: "block",
                  transition: "border .2s",
                }}
                onFocus={(e) => (e.target.style.border = "1px solid var(--gr)")}
                onBlur={(e) => (e.target.style.border = "1px solid var(--bd)")}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <M
                  style={{
                    fontSize: 10,
                    color:
                      answer.split(/\s+/).filter(Boolean).length >=
                        (qtype === "long" ? 30 : 8)
                        ? "var(--gr)"
                        : "var(--t3)",
                  }}
                >
                  {answer.split(/\s+/).filter(Boolean).length} words
                  {qtype === "long" &&
                    answer.split(/\s+/).filter(Boolean).length < 30
                    ? " — keep going!"
                    : ""}
                </M>
                {answer.length > 0 && (
                  <M style={{ fontSize: 10, color: "var(--gr)" }}>
                    Ready to evaluate
                  </M>
                )}
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={evaluate}
              disabled={qtype === "mcq" ? !choice : !answer.trim()}
              loading={busy}
              full
              style={{ padding: 13, fontSize: 14 }}
            >
              {busy ? busyMsg : "⚡ Submit & Evaluate"}
            </Btn>
            <Btn
              v="sec"
              onClick={handleNewQ}
              disabled={busy}
              style={{ flexShrink: 0, gap: 6 }}
            >
              🎲 New Q
            </Btn>
          </div>

          {!hasAnswer && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--ye2)",
                borderRadius: 9,
                border: "1px solid rgba(247,204,69,.25)",
              }}
            >
              <M style={{ fontSize: 11, color: "var(--ye)" }}>
                💡 Tip: Submit your best attempt before clicking New Q — even
                guessing builds memory!
              </M>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ RESULT ══ */
  if (step === "result" && result) {
    const showHint = result.overall < 50,
      seList = Object.entries(result.scores || {});
    return (
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: 28 }}
        className="fu"
      >
        {/* Score Hero */}
        <Card
          accent={vc[result.verdict] || "var(--gr)"}
          style={{
            textAlign: "center",
            padding: "30px 22px",
            marginBottom: 14,
          }}
          glow={result.overall >= 75}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {ve[result.verdict] || "📊"}
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: vc[result.verdict] || "var(--gr)",
              lineHeight: 1,
            }}
          >
            {result.overall}
            <span style={{ fontSize: 28, opacity: 0.55 }}>%</span>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: vc[result.verdict],
              marginTop: 6,
              marginBottom: 14,
            }}
          >
            {result.verdict}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Pill
              color={diff === "easy" ? "gr" : diff === "medium" ? "ye" : "re"}
            >
              {DIFFS.find((d) => d.id === diff)?.emoji} {diff}
            </Pill>
            <Pill color="cy">{QTYPES.find((q) => q.id === qtype)?.long}</Pill>
            <Pill color="bl">{topic?.name}</Pill>
            {streak > 1 && <Pill color="ye">🔥 {streak} streak</Pill>}
          </div>
        </Card>

        {/* Motivation + Hint */}
        {showHint && (
          <Card accent="var(--pu)" style={{ marginBottom: 14 }} className="pop">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>💡</span>
              <div style={{ flex: 1 }}>
                <ML c="var(--pu)">MOTIVATION + HINT ENGINE</ML>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--t2)",
                    fontFamily: "Lora,serif",
                    fontStyle: "italic",
                    lineHeight: 1.7,
                    marginBottom: 12,
                  }}
                >
                  {motivMsg}
                </p>
                {!hint && (
                  <Btn v="pur" onClick={getHint} sm>
                    💡 Get Personalised Hint
                  </Btn>
                )}
                {hint === "__loading__" && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Spin s={14} c="var(--pu)" />
                    <M style={{ fontSize: 11, color: "var(--pu)" }}>
                      Generating hint...
                    </M>
                  </div>
                )}
                {hint && hint !== "__loading__" && (
                  <div
                    style={{
                      background: "var(--pu2)",
                      borderRadius: 9,
                      padding: "10px 14px",
                      border: "1px solid rgba(168,124,248,.3)",
                    }}
                    className="pop"
                  >
                    <ML c="var(--pu)">YOUR HINT —</ML>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--tx)",
                        lineHeight: 1.65,
                      }}
                    >
                      {hint}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Score Bars */}
        {seList.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <ML>SCORE BREAKDOWN</ML>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {seList.map(([k, v]) => (
                <div key={k}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{k}</span>
                    <M style={{ fontSize: 12, fontWeight: 700, color: sc(v) }}>
                      {v}%
                    </M>
                  </div>
                  <Track val={v} color={sc(v)} height={6} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* MCQ Reveal */}
        {result.type === "mcq" && (
          <Card
            accent={result.correct ? "var(--gr)" : "var(--re)"}
            style={{ marginBottom: 14 }}
          >
            <ML c={result.correct ? "var(--gr)" : "var(--re)"}>
              {result.correct ? "✓ CORRECT" : "✗ INCORRECT — CORRECT ANSWER"}
            </ML>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--tx)",
                marginBottom: 8,
              }}
            >
              ({result.correctKey}) {result.correctText}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--t2)",
                lineHeight: 1.65,
                fontFamily: "Lora,serif",
              }}
            >
              {result.explanation}
            </p>
          </Card>
        )}

        {/* AI Feedback */}
        <Card style={{ marginBottom: 14 }}>
          <ML>AI EVALUATOR FEEDBACK</ML>
          <p
            style={{
              fontSize: 14,
              color: "var(--t2)",
              lineHeight: 1.75,
              fontFamily: "Lora,serif",
              marginBottom: 14,
            }}
          >
            {result.feedback}
          </p>
          {result.strengths?.filter(Boolean).length > 0 && (
            <div
              style={{
                background: "rgba(15,217,160,.07)",
                borderRadius: 9,
                padding: "10px 14px",
                marginBottom: 8,
                borderLeft: "3px solid var(--gr)",
              }}
            >
              <ML c="var(--gr)">✓ WHAT YOU GOT RIGHT</ML>
              {result.strengths.filter(Boolean).map((s, i) => (
                <p
                  key={i}
                  style={{ fontSize: 12, color: "var(--t2)", marginBottom: 3 }}
                >
                  • {s}
                </p>
              ))}
            </div>
          )}
          {result.improvements?.filter(Boolean).length > 0 && (
            <div
              style={{
                background: "rgba(247,204,69,.07)",
                borderRadius: 9,
                padding: "10px 14px",
                marginBottom: 8,
                borderLeft: "3px solid var(--ye)",
              }}
            >
              <ML c="var(--ye)">→ HOW TO IMPROVE</ML>
              {result.improvements.filter(Boolean).map((s, i) => (
                <p
                  key={i}
                  style={{ fontSize: 12, color: "var(--t2)", marginBottom: 3 }}
                >
                  • {s}
                </p>
              ))}
            </div>
          )}
          {result.gap && (
            <div
              style={{
                background: "rgba(242,85,110,.07)",
                borderRadius: 9,
                padding: "10px 14px",
                borderLeft: "3px solid var(--re)",
              }}
            >
              <ML c="var(--re)">⚠ KEY CONCEPTUAL GAP</ML>
              <p style={{ fontSize: 12, color: "var(--t2)" }}>{result.gap}</p>
            </div>
          )}
        </Card>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn
            onClick={() => {
              setStep("configure");
              reset();
            }}
            style={{ flex: 1, padding: 12 }}
          >
            Try Another →
          </Btn>
          <Btn v="ghost" onClick={() => setStep("report")} sm>
            📋 Full Report
          </Btn>
          {doneCount >= 3 && (
            <Btn v="sec" onClick={onDashboard} sm>
              📊 Dashboard
            </Btn>
          )}
          <Btn
            v="sec"
            onClick={() => {
              setStep("pick");
              setTopic(null);
              reset();
            }}
            sm
          >
            ← Topics
          </Btn>
        </div>
      </div>
    );
  }

  /* ══ FULL REPORT ══ */
  if (step === "report" && result) {
    const seList = Object.entries(result.scores || {}),
      barData = seList.map(([n, s]) => ({ name: n, score: s }));
    return (
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: 28 }}
        className="fu"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div>
            <Pill color="bl">FULL ASSESSMENT REPORT</Pill>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: 8,
                marginBottom: 3,
              }}
            >
              {topic?.name}
            </h2>
            <p
              style={{
                color: "var(--t3)",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11,
              }}
            >
              {topic?.unitName} · {syllabus.course}
            </p>
          </div>
          <Btn v="sec" onClick={() => setStep("result")} sm>
            ← Back
          </Btn>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            { l: "Score", v: `${result.overall}%`, c: sc(result.overall) },
            { l: "Verdict", v: result.verdict, c: vc[result.verdict] },
            {
              l: "Difficulty",
              v: DIFFS.find((d) => d.id === diff)?.emoji + " " + diff,
              c: dc(diff),
            },
            {
              l: "Format",
              v: QTYPES.find((q) => q.id === qtype)?.long,
              c: "var(--cy)",
            },
          ].map((s) => (
            <Card key={s.l} style={{ padding: "13px 15px" }}>
              <M
                style={{
                  fontSize: 9,
                  color: "var(--t3)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                {s.l}
              </M>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>
                {s.v}
              </div>
            </Card>
          ))}
        </div>
        {barData.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <ML>DIMENSIONAL ANALYSIS</ML>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={barData}
                margin={{ top: 0, right: 0, left: -22, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: "var(--t3)",
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 9,
                    fill: "var(--t3)",
                    fontFamily: "IBM Plex Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--c2)",
                    border: "1px solid var(--bd)",
                    borderRadius: 8,
                    fontFamily: "IBM Plex Mono",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={sc(d.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        <Card style={{ marginBottom: 14 }}>
          <ML>Q&A REVIEW</ML>
          <div
            style={{
              background: "var(--cy2)",
              borderRadius: 9,
              padding: 14,
              marginBottom: 10,
              borderLeft: "3px solid var(--cy)",
            }}
          >
            <ML c="var(--cy)">QUESTION</ML>
            <p
              style={{
                fontSize: 13,
                color: "var(--tx)",
                lineHeight: 1.65,
                fontFamily: "Lora,serif",
              }}
            >
              {qdata?.question}
            </p>
          </div>
          <div
            style={{
              background: `${sc(result.overall)}18`,
              borderRadius: 9,
              padding: 14,
              marginBottom: result.type === "mcq" ? 10 : 0,
              borderLeft: `3px solid ${sc(result.overall)}`,
            }}
          >
            <ML c={sc(result.overall)}>YOUR ANSWER</ML>
            <p
              style={{
                fontSize: 13,
                color: "var(--t2)",
                lineHeight: 1.65,
                fontFamily: "Lora,serif",
                fontStyle: "italic",
              }}
            >
              {result.type === "mcq"
                ? `(${result.chosen}) ${result.chosenText}`
                : answer || "(No answer provided)"}
            </p>
          </div>
          {result.type === "mcq" && (
            <div
              style={{
                background: "var(--gr2)",
                borderRadius: 9,
                padding: 14,
                borderLeft: "3px solid var(--gr)",
              }}
            >
              <ML c="var(--gr)">CORRECT ANSWER</ML>
              <p style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>
                ({result.correctKey}) {result.correctText}
              </p>
              {result.explanation && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--t2)",
                    marginTop: 6,
                    fontFamily: "Lora,serif",
                    fontStyle: "italic",
                  }}
                >
                  {result.explanation}
                </p>
              )}
            </div>
          )}
          {result.type !== "mcq" && qdata?.sampleAnswer && (
            <div
              style={{
                background: "var(--cy2)",
                borderRadius: 9,
                padding: 14,
                marginTop: 10,
                borderLeft: "3px solid var(--cy)",
              }}
            >
              <ML c="var(--cy)">MODEL ANSWER</ML>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--t2)",
                  lineHeight: 1.7,
                  fontFamily: "Lora,serif",
                  fontStyle: "italic",
                }}
              >
                {qdata.sampleAnswer}
              </p>
            </div>
          )}
        </Card>
        <Card accent={vc[result.verdict]} style={{ marginBottom: 14 }}>
          <ML c={vc[result.verdict]}>
            FULL AI FEEDBACK — {result.verdict?.toUpperCase()}
          </ML>
          <p
            style={{
              fontSize: 14,
              color: "var(--t2)",
              lineHeight: 1.75,
              fontFamily: "Lora,serif",
              marginBottom: 14,
            }}
          >
            {result.feedback}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            {result.strengths?.filter(Boolean).length > 0 && (
              <div
                style={{
                  background: "var(--gr2)",
                  borderRadius: 9,
                  padding: "10px 12px",
                }}
              >
                <ML c="var(--gr)">✓ STRENGTHS</ML>
                {result.strengths.filter(Boolean).map((s, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "var(--t2)",
                      marginBottom: 3,
                    }}
                  >
                    • {s}
                  </p>
                ))}
              </div>
            )}
            {result.improvements?.filter(Boolean).length > 0 && (
              <div
                style={{
                  background: "var(--ye2)",
                  borderRadius: 9,
                  padding: "10px 12px",
                }}
              >
                <ML c="var(--ye)">→ IMPROVEMENTS</ML>
                {result.improvements.filter(Boolean).map((s, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "var(--t2)",
                      marginBottom: 3,
                    }}
                  >
                    • {s}
                  </p>
                ))}
              </div>
            )}
          </div>
          {result.gap && (
            <div
              style={{
                background: "var(--re2)",
                borderRadius: 9,
                padding: "10px 12px",
                marginBottom: 10,
              }}
            >
              <ML c="var(--re)">⚠ CONCEPTUAL GAP</ML>
              <p style={{ fontSize: 12, color: "var(--t2)" }}>{result.gap}</p>
            </div>
          )}
          {result.modelPoints?.filter(Boolean).length > 0 && (
            <div
              style={{
                background: "var(--bl2)",
                borderRadius: 9,
                padding: "10px 12px",
              }}
            >
              <ML c="var(--bl)">◈ IDEAL ANSWER KEY POINTS</ML>
              {result.modelPoints.filter(Boolean).map((p, i) => (
                <p
                  key={i}
                  style={{ fontSize: 12, color: "var(--t2)", marginBottom: 3 }}
                >
                  • {p}
                </p>
              ))}
            </div>
          )}
        </Card>
        <Card accent="var(--gr)">
          <ML c="var(--gr)">📋 RECOMMENDED NEXT STEPS</ML>
          {(result.overall < 45
            ? [
              "Re-read your notes on " + topic?.name + " from scratch.",
              "Start with Easy difficulty — build your foundation first.",
              "Focus specifically on the conceptual gap highlighted above.",
            ]
            : result.overall < 70
              ? [
                "Practice 2-3 more questions on " +
                topic?.name +
                " at this difficulty.",
                "Compare your answer to the model answer — identify exactly what you missed.",
                "Move to related topics to strengthen surrounding knowledge.",
              ]
              : [
                "Excellent! Push to Hard difficulty to challenge your mastery.",
                "Move to the next unit — your foundation here is solid.",
                "Check the Dashboard to identify weaker areas across the full syllabus.",
              ]
          ).map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <M style={{ color: "var(--gr)", fontSize: 13, flexShrink: 0 }}>
                {i + 1}.
              </M>
              <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55 }}>
                {r}
              </p>
            </div>
          ))}
        </Card>
      </div>
    );
  }
   return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 400,
      }}
    >
      <Btn onClick={() => setStep("pick")}>
        ← Go to Topics
      </Btn>
    </div>
  );
}

  /* ═══════════════════════════════ DASHBOARD ═══════════════════════════════ */
  function Dashboard({ syllabus, scores, user, history, onAssess }) {
    const allTopics =
      syllabus.units?.flatMap((u) =>
        u.topics.map((t) => ({ ...t, unitName: u.name })),
      ) || [];
    const assessed = allTopics.filter((t) => scores[t.id] !== undefined);
    const overall = assessed.length
      ? Math.round(
        assessed.reduce((s, t) => s + scores[t.id], 0) / assessed.length,
      )
      : 0;

    const unitStats = (syllabus.units || []).map((u) => {
      const ut = u.topics.filter((t) => scores[t.id] !== undefined);
      const avg = ut.length
        ? Math.round(ut.reduce((s, t) => s + scores[t.id], 0) / ut.length)
        : 0;
      const pct = Math.round((ut.length / Math.max(1, u.topics.length)) * 100);
      return {
        name: u.name,
        short: u.name.length > 14 ? u.name.slice(0, 14) + "…" : u.name,
        avg,
        done: ut.length,
        total: u.topics.length,
        pct,
      };
    });

    const strengths = assessed
      .filter((t) => scores[t.id] >= 75)
      .sort((a, b) => scores[b.id] - scores[a.id]);
    const developing = assessed.filter(
      (t) => scores[t.id] >= 50 && scores[t.id] < 75,
    );
    const weak = assessed
      .filter((t) => scores[t.id] < 50)
      .sort((a, b) => scores[a.id] - scores[b.id]);

    const readiness =
      overall >= 80
        ? "Exam Ready 🏆"
        : overall >= 65
          ? "Almost Ready ✅"
          : overall >= 45
            ? "Developing 📈"
            : "Building Base 🌱";
    const readCol =
      overall >= 80
        ? "var(--gr)"
        : overall >= 65
          ? "var(--cy)"
          : overall >= 45
            ? "var(--ye)"
            : "var(--re)";

    const diffStats = DIFFS.map((d) => {
      const dh = history.filter((h) => h.diff === d.id);
      return {
        ...d,
        avg: dh.length
          ? Math.round(dh.reduce((s, h) => s + h.score, 0) / dh.length)
          : 0,
        count: dh.length,
        color: dc(d.id),
      };
    });
    const typeStats = QTYPES.map((qt, i) => {
      const qh = history.filter((h) => h.qtype === qt.id);
      return {
        ...qt,
        avg: qh.length
          ? Math.round(qh.reduce((s, h) => s + h.score, 0) / qh.length)
          : 0,
        count: qh.length,
        color: ["var(--cy)", "var(--pu)", "var(--or)"][i],
      };
    });

    // Bar chart data for difficulty performance
    const diffBarData = diffStats.map((d) => ({
      name: d.emoji + " " + d.label,
      score: d.avg,
      color: d.color,
    }));
    const typeBarData = typeStats.map((t) => ({
      name: t.icon + " " + t.label,
      score: t.avg,
      color: t.color,
    }));

    return (
      <div
        style={{ padding: 26, maxWidth: 1080, margin: "0 auto" }}
        className="fu"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 22,
          }}
        >
          <div>
            <Pill color="gr">SKILL INTELLIGENCE DASHBOARD</Pill>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {user.name}'s Mastery Profile
            </h2>
            <p
              style={{
                color: "var(--t2)",
                fontFamily: "Lora,serif",
                fontStyle: "italic",
                fontSize: 14,
              }}
            >
              {syllabus.course}
            </p>
          </div>
          <Btn v="ghost" onClick={onAssess} sm>
            ← Continue Assessing
          </Btn>
        </div>

        {/* Top KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            { l: "AI Readiness", v: readiness, c: readCol },
            {
              l: "Assessed",
              v: `${assessed.length}/${allTopics.length}`,
              c: "var(--cy)",
            },
            { l: "Mastered ≥75", v: strengths.length, c: "var(--gr)" },
            { l: "Weak <50", v: weak.length, c: "var(--re)" },
            { l: "Total Attempts", v: history.length, c: "var(--pu)" },
          ].map((s) => (
            <Card key={s.l} style={{ padding: "14px 15px" }}>
              <M
                style={{
                  fontSize: 9,
                  color: "var(--t3)",
                  display: "block",
                  marginBottom: 5,
                  letterSpacing: ".07em",
                }}
              >
                {s.l}
              </M>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: s.c,
                  lineHeight: 1.1,
                }}
              >
                {s.v}
              </div>
            </Card>
          ))}
        </div>

        {/* ── Unit Mastery Rings (replaces radar) ── */}
        <Card style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <ML>UNIT MASTERY — SCORE RINGS</ML>
            <M style={{ fontSize: 10, color: "var(--t3)" }}>
              Ring = avg score · Fill = % topics completed
            </M>
          </div>
          {unitStats.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))",
                gap: 16,
                justifyItems: "center",
              }}
            >
              {unitStats.map((u, i) => {
                const color = u.avg > 0 ? sc(u.avg) : "var(--bd2)";
                return (
                  <div
                    key={u.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      padding: "16px 10px",
                      background: "var(--c2)",
                      borderRadius: 12,
                      border: `1px solid ${u.avg > 0 ? color + "40" : "var(--bd)"}`,
                      width: "100%",
                      animation: `fu .4s ${i * 0.06}s both`,
                    }}
                  >
                    <Ring
                      val={u.avg}
                      size={90}
                      stroke={7}
                      color={color}
                      sub={`${u.done}/${u.total}`}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--tx)",
                          lineHeight: 1.3,
                          marginBottom: 4,
                        }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{
                          height: 3,
                          background: "var(--c3)",
                          borderRadius: 2,
                          overflow: "hidden",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${u.pct}%`,
                            background: color,
                            borderRadius: 2,
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                      <M
                        style={{ fontSize: 9, color: "var(--t3)", marginTop: 3 }}
                      >
                        {u.pct}% topics done
                      </M>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                height: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 36 }}>🎯</div>
              <M style={{ fontSize: 12, color: "var(--t3)" }}>
                Complete assessments to see your unit mastery rings
              </M>
              <Btn v="ghost" onClick={onAssess} sm>
                Start Assessing →
              </Btn>
            </div>
          )}
        </Card>

        {/* Performance charts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <Card>
            <ML>PERFORMANCE BY DIFFICULTY</ML>
            {diffBarData.some((d) => d.score > 0) ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart
                  data={diffBarData}
                  margin={{ top: 0, right: 0, left: -22, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "var(--t2)",
                      fontFamily: "IBM Plex Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 9,
                      fill: "var(--t3)",
                      fontFamily: "IBM Plex Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--c2)",
                      border: "1px solid var(--bd)",
                      borderRadius: 8,
                      fontFamily: "IBM Plex Mono",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {diffBarData.map((d, i) => (
                      <Cell key={i} fill={d.score > 0 ? d.color : "var(--bd2)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 130,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <M style={{ fontSize: 11, color: "var(--t3)" }}>No data yet</M>
              </div>
            )}
            <div
              style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
            >
              {diffStats.map((d) => (
                <div
                  key={d.id}
                  style={{
                    flex: 1,
                    minWidth: 60,
                    padding: "8px 10px",
                    background: "var(--c2)",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <M
                    style={{ fontSize: 9, color: "var(--t3)", display: "block" }}
                  >
                    {d.emoji} {d.label}
                  </M>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: d.count > 0 ? d.color : "var(--t3)",
                      marginTop: 2,
                    }}
                  >
                    {d.count > 0 ? `${d.avg}%` : "—"}
                  </div>
                  <M style={{ fontSize: 9, color: "var(--t3)" }}>
                    {d.count} attempts
                  </M>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <ML>PERFORMANCE BY QUESTION TYPE</ML>
            {typeBarData.some((d) => d.score > 0) ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart
                  data={typeBarData}
                  margin={{ top: 0, right: 0, left: -22, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 10,
                      fill: "var(--t2)",
                      fontFamily: "IBM Plex Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontSize: 9,
                      fill: "var(--t3)",
                      fontFamily: "IBM Plex Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--c2)",
                      border: "1px solid var(--bd)",
                      borderRadius: 8,
                      fontFamily: "IBM Plex Mono",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {typeBarData.map((d, i) => (
                      <Cell key={i} fill={d.score > 0 ? d.color : "var(--bd2)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 130,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <M style={{ fontSize: 11, color: "var(--t3)" }}>No data yet</M>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {typeStats.map((qt) => (
                <div
                  key={qt.id}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    background: "var(--c2)",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <M
                    style={{ fontSize: 9, color: "var(--t3)", display: "block" }}
                  >
                    {qt.icon} {qt.label}
                  </M>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: qt.count > 0 ? qt.color : "var(--t3)",
                      marginTop: 2,
                    }}
                  >
                    {qt.count > 0 ? `${qt.avg}%` : "—"}
                  </div>
                  <M style={{ fontSize: 9, color: "var(--t3)" }}>{qt.count}q</M>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Strength / Developing / Weak */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {[
            {
              title: "✦ MASTERED ≥75%",
              color: "var(--gr)",
              items: strengths,
              empty: "Keep assessing — you'll get here!",
            },
            {
              title: "◈ DEVELOPING 50–74%",
              color: "var(--ye)",
              items: developing,
              empty:
                assessed.length === 0
                  ? "Start your first assessment!"
                  : "None in mid-range yet",
            },
            {
              title: "⚠ NEEDS WORK <50%",
              color: "var(--re)",
              items: weak,
              empty:
                assessed.length === 0
                  ? "Start your first assessment!"
                  : "🎉 No weak topics yet!",
            },
          ].map((panel) => (
            <Card key={panel.title} style={{ padding: 16 }}>
              <ML c={panel.color}>{panel.title}</ML>
              {panel.items.length === 0 ? (
                <p
                  style={{
                    color: "var(--t3)",
                    fontFamily: "'IBM Plex Mono',monospace",
                    fontSize: 11,
                  }}
                >
                  {panel.empty}
                </p>
              ) : (
                panel.items.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--bd)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--t2)",
                        flex: 1,
                        marginRight: 8,
                        lineHeight: 1.3,
                      }}
                    >
                      {t.name}
                    </span>
                    <M
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: sc(scores[t.id]),
                        flexShrink: 0,
                      }}
                    >
                      {scores[t.id]}%
                    </M>
                  </div>
                ))
              )}
            </Card>
          ))}
        </div>

        {/* Activity Log */}
        {history.length > 0 && (
          <Card>
            <ML>RECENT ACTIVITY LOG</ML>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 8,
              }}
            >
              {history.slice(0, 14).map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 13px",
                    background: "var(--c2)",
                    borderRadius: 10,
                    display: "flex",
                    gap: 11,
                    alignItems: "center",
                    border: "1px solid var(--bd)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${sc(h.score)}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: `1px solid ${sc(h.score)}30`,
                    }}
                  >
                    <M
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: sc(h.score),
                      }}
                    >
                      {h.score}%
                    </M>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 4,
                      }}
                    >
                      {h.topic}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <Pill
                        color={h.score >= 75 ? "gr" : h.score >= 50 ? "ye" : "re"}
                      >
                        {h.verdict}
                      </Pill>
                      <Pill
                        color={
                          h.diff === "easy"
                            ? "gr"
                            : h.diff === "medium"
                              ? "ye"
                              : "re"
                        }
                      >
                        {h.diff}
                      </Pill>
                      <Pill color="pu">{h.qtype}</Pill>
                    </div>
                  </div>
                  <M style={{ fontSize: 9, color: "var(--t3)", flexShrink: 0 }}>
                    {h.ts}
                  </M>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    ); 
  }

  /* ═══════════════════════════════ ROOT APP ═══════════════════════════════ */
  function SyllabusMastery() {
    const [screen, setScreen] = useState("landing");
    const [user, setUser] = useState(null);
    const [syllabus, setSyllabus] = useState(null);
    const [scores, setScores] = useState({});
    const [history, setHistory] = useState([]);
    const [col, setCol] = useState(false);

    const allT = syllabus?.units?.flatMap((u) => u.topics) || [];
    const done = allT.filter((t) => scores[t.id] !== undefined).length;
    const avg =
      done > 0
        ? Math.round(
          Object.values(scores).reduce((a, b) => a + b, 0) /
          Object.values(scores).length,
        )
        : 0;

    const NAV = [
      { id: "upload", label: "Syllabus", icon: "◫", lock: false },
      { id: "assess", label: "Assessment", icon: "◈", lock: !syllabus },
      { id: "dashboard", label: "Dashboard", icon: "◎", lock: !syllabus },
    ];

    if (screen === "landing")
      return (
        <>
          <Styles />
          <Landing
            onEnter={(u) => {
              setUser(u);
              setScreen("upload");
            }}
          />
        </>
      );

    return (
      <>
        <Styles />
        <div
          style={{ display: "flex", height: "100vh", background: "var(--bg)" }}
        >
          {/* Sidebar */}
          <div
            style={{
              width: col ? 52 : 200,
              transition: "width .28s",
              background: "var(--c1)",
              borderRight: "1px solid var(--bd)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "14px 12px",
                borderBottom: "1px solid var(--bd)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onClick={() => setCol((c) => !c)}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#0fd9a0,#25d8f0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#060b14",
                  flexShrink: 0,
                }}
              >
                S
              </div>
              {!col && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  SyllabusMastery
                </span>
              )}
            </div>
            <div style={{ flex: 1, padding: "10px 8px" }}>
              {!col && (
                <M
                  style={{
                    fontSize: 9,
                    color: "var(--t3)",
                    letterSpacing: ".12em",
                    display: "block",
                    padding: "0 6px",
                    marginBottom: 6,
                  }}
                >
                  NAVIGATION
                </M>
              )}
              {NAV.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.lock && setScreen(n.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 8px",
                    borderRadius: 8,
                    cursor: n.lock ? "not-allowed" : "pointer",
                    background:
                      screen === n.id ? "rgba(15,217,160,.1)" : "transparent",
                    borderLeft: `2px solid ${screen === n.id ? "var(--gr)" : "transparent"}`,
                    marginBottom: 2,
                    opacity: n.lock ? 0.35 : 1,
                    transition: "all .15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      color: screen === n.id ? "var(--gr)" : "var(--t3)",
                      flexShrink: 0,
                    }}
                  >
                    {n.icon}
                  </span>
                  {!col && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: screen === n.id ? 700 : 400,
                        color: screen === n.id ? "var(--tx)" : "var(--t2)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!col && user && (
              <div style={{ padding: "10px", borderTop: "1px solid var(--bd)" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--c2)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                    {user.name}
                  </div>
                  <M
                    style={{
                      fontSize: 10,
                      color: "var(--t3)",
                      display: "block",
                      marginBottom: syllabus ? 8 : 0,
                    }}
                  >
                    {user.email}
                  </M>
                  {syllabus && (
                    <>
                      <Track
                        val={(done / Math.max(1, allT.length)) * 100}
                        color="var(--gr)"
                        height={3}
                      />
                      <M
                        style={{
                          fontSize: 9,
                          color: "var(--t3)",
                          display: "block",
                          marginTop: 4,
                        }}
                      >
                        {done}/{allT.length} topics assessed
                      </M>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Topbar */}
            <div
              style={{
                height: 46,
                borderBottom: "1px solid var(--bd)",
                background: "rgba(6,11,20,.92)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {syllabus && (
                  <>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--t3)",
                        fontFamily: "'IBM Plex Mono',monospace",
                      }}
                    >
                      {syllabus.course}
                    </span>
                    <Pill color="cy">{syllabus.units?.length} units</Pill>
                    <Pill color="bl">{syllabus.totalTopics} topics</Pill>
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {done > 0 && (
                  <>
                    <div
                      style={{
                        width: 80,
                        height: 4,
                        background: "var(--bd)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${avg}%`,
                          background: sc(avg),
                          borderRadius: 2,
                          transition: "width .5s",
                        }}
                      />
                    </div>
                    <M style={{ fontSize: 11, color: sc(avg) }}>{avg}% avg</M>
                    {history.length > 0 && (
                      <Pill color="pu">{history.length} attempts</Pill>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {screen === "upload" && (
                <Upload
                  onDone={(s) => {
                    setSyllabus(s);
                    setScreen("assess");
                  }}
                />
              )}
              {screen === "assess" && syllabus && (
                <Assessment
                  syllabus={syllabus}
                  scores={scores}
                  setScores={setScores}
                  history={history}
                  setHistory={setHistory}
                  onDashboard={() => setScreen("dashboard")}
                />
              )}
              {screen === "dashboard" && syllabus && (
                <Dashboard
                  syllabus={syllabus}
                  scores={scores}
                  user={user}
                  history={history}
                  onAssess={() => setScreen("assess")}
                />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
  export default SyllabusMastery;
