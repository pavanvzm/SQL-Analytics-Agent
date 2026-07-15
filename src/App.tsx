import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  BarChart3,
  Brain,
  Database,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  LayoutDashboard,
  Play,
} from "lucide-react";

// GitHub logo SVG (not available in lucide-react)
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// ── Utility Components ──────────────────────────────────────────────────

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : 0,
      x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Navbar ──────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold text-white group-hover:scale-110 transition-transform">
            SA
          </div>
          <span className="font-semibold text-sm sm:text-base text-white">
            SQL Analytics Agent
          </span>
        </a>
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="https://github.com/pavanvzm/SQL-Analytics-Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="./TestWebsite/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs sm:text-sm font-medium transition-all hover:shadow-lg hover:shadow-brand-500/25 active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Demo</span>
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────

function Hero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs sm:text-sm text-brand-300 mb-8 border-brand-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Natural Language → SQL — Powered by AI</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight"
        >
          Ask Questions.{" "}
          <span className="text-gradient">Get Answers.</span>
          <br />
          <span className="text-zinc-400">No SQL Required.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          SQL Analytics Agent converts your plain-English questions into SQL,
          validates them for safety, executes them against DuckDB, and
          visualizes the results — all with an automatic self-healing loop.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="./TestWebsite/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all hover:shadow-xl hover:shadow-brand-500/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Launch Interactive Demo
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-zinc-300 font-medium transition-all active:scale-95"
          >
            See How It Works
            <ChevronDown className="w-4 h-4" />
          </a>
          <a
            href="https://github.com/pavanvzm/SQL-Analytics-Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-zinc-300 font-medium transition-all active:scale-95"
          >                <GithubIcon className="w-4 h-4" />
                View on GitHub
          </a>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-wrap justify-center gap-3 sm:gap-6"
        >
          {[
            { icon: Shield, label: "SQL Validation" },
            { icon: Zap, label: "Self-Healing Loop" },
            { icon: BarChart3, label: "Auto Charts" },
            { icon: Brain, label: "AI-Powered" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs sm:text-sm text-zinc-400 border border-white/5"
            >
              <item.icon className="w-3.5 h-3.5 text-brand-400" />
              {item.label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── How It Works ────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Ask in English",
    description:
      "Type any question about your data — 'What were our top 5 products last month?' The agent understands natural language.",
    icon: MessageSquare,
    color: "from-emerald-400 to-teal-500",
  },
  {
    number: "02",
    title: "Schema Discovery",
    description:
      "The agent automatically introspects your DuckDB database, discovering tables, columns, types, row counts, and relationships.",
    icon: Database,
    color: "from-blue-400 to-cyan-500",
  },
  {
    number: "03",
    title: "AI Generates SQL",
    description:
      "Using the schema as context, an LLM (OpenAI) generates a SQL query tailored to your question and your data structure.",
    icon: Brain,
    color: "from-violet-400 to-purple-500",
  },
  {
    number: "04",
    title: "SQL Validation",
    description:
      "SQLGlot parses the generated SQL. Only SELECT statements pass. Syntax errors and DDL/DML (INSERT, DROP, etc.) are blocked immediately.",
    icon: Shield,
    color: "from-amber-400 to-orange-500",
  },
  {
    number: "05",
    title: "Sandboxed Execution",
    description:
      "The query runs against DuckDB in read-only mode with a 10-second timeout and a 1,000-row limit. No data is ever modified.",
    icon: Zap,
    color: "from-green-400 to-emerald-500",
  },
  {
    number: "06",
    title: "Self-Healing Loop",
    description:
      "If validation or execution fails, the error is fed back to the LLM for up to 3 automatic corrections. No manual debugging needed.",
    icon: CheckCircle2,
    color: "from-rose-400 to-pink-500",
  },
  {
    number: "07",
    title: "Charts & Summary",
    description:
      "Plotly auto-selects the best chart (bar, line, pie, or scatter) and generates a plain-English insight — all in one view.",
    icon: BarChart3,
    color: "from-sky-400 to-indigo-500",
  },
];

function HowItWorks() {
  return (
    <Section id="how-it-works">
      <FadeIn>
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
            Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            How It Works
          </h2>
          <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
            From natural language to insightful visualizations in 7 automated steps.
          </p>
        </div>
      </FadeIn>

      {/* Flow diagram */}
      <FadeIn delay={0.2}>
        <div className="glass rounded-2xl p-6 sm:p-8 mb-16 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max text-xs sm:text-sm font-mono">
            {[
              "📝 Question",
              "→",
              "📋 Schema",
              "→",
              "🤖 LLM SQL",
              "→",
              "🔒 Validate",
              "→",
              "⚡ Execute",
              "→",
              "📊 Charts",
              "→",
              "📝 Summary",
            ].map((step, i) => (
              <span
                key={i}
                className={`px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  step === "→"
                    ? "text-zinc-600"
                    : step === "🔒 Validate" || step === "⚡ Execute"
                    ? "bg-brand-500/15 text-brand-300 border border-brand-500/20"
                    : "bg-white/5 text-zinc-300 border border-white/10"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
          <div className="mt-4 text-xs text-zinc-500 text-center">
            ↻ Error feedback loop — retries up to 3 times with LLM correction
          </div>
        </div>
      </FadeIn>

      {/* Steps grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((step, i) => (
          <FadeIn key={step.number} delay={0.1 * i}>
            <div className="glass rounded-xl p-5 sm:p-6 glass-hover transition-all h-full group">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-bold mb-4 group-hover:scale-110 transition-transform`}
              >
                {step.number}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <step.icon className="w-4 h-4 text-brand-400" />
                <h3 className="font-semibold text-white text-sm sm:text-base">
                  {step.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ── Features ────────────────────────────────────────────────────────────

const features = [
  {
    title: "Dynamic Schema Discovery",
    description:
      "Automatically introspects your DuckDB database — tables, columns, types, row counts, and even infers foreign-key relationships by naming conventions.",
    icon: Database,
  },
  {
    title: "SQLGlot Validation",
    description:
      "Every query is parsed and validated by SQLGlot. Only SELECT statements pass. DDL, DML, and syntax errors are caught before execution.",
    icon: Shield,
  },
  {
    title: "Self-Healing Retry Loop",
    description:
      "Errors are automatically fed back to the LLM for correction. The agent retries up to 3 times, fixing issues without user intervention.",
    icon: Zap,
  },
  {
    title: "Sandboxed DuckDB Execution",
    description:
      "Queries run in read-only mode with a 10-second timeout and 1,000-row limit. Your data is never modified, and runaway queries are killed.",
    icon: LayoutDashboard,
  },
  {
    title: "Auto-Selected Charts",
    description:
      "Plotly automatically picks the best chart type — bar, line, pie, or scatter — based on your data shape. No manual chart configuration needed.",
    icon: BarChart3,
  },
  {
    title: "Plain-English Summaries",
    description:
      "A template-based summary highlights key stats, and optionally enriches it with an LLM-generated insight for deeper understanding.",
    icon: MessageSquare,
  },
];

function Features() {
  return (
    <Section id="features">
      <FadeIn>
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything You Need
          </h2>
          <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
            A complete toolchain for querying databases with natural language.
          </p>
        </div>
      </FadeIn>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {features.map((feature, i) => (
          <FadeIn key={feature.title} delay={0.1 * i}>
            <div className="glass rounded-xl p-5 sm:p-6 glass-hover transition-all h-full">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ── Tech Stack ──────────────────────────────────────────────────────────

const techStack = [
  { name: "Streamlit", role: "UI Framework", color: "text-red-400" },
  { name: "LangChain", role: "LLM Orchestration", color: "text-green-400" },
  { name: "OpenAI", role: "GPT-4o / GPT-4o-mini", color: "text-teal-400" },
  { name: "SQLGlot", role: "SQL Parser", color: "text-blue-400" },
  { name: "DuckDB", role: "Query Engine", color: "text-yellow-400" },
  { name: "Plotly", role: "Charts", color: "text-cyan-400" },
  { name: "Pandas", role: "Data Processing", color: "text-violet-400" },
  { name: "Python", role: "Language", color: "text-blue-300" },
];

function TechStack() {
  return (
    <Section id="tech-stack" className="py-16 sm:py-20">
      <FadeIn>
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
            Technology
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Tech Stack</h2>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {techStack.map((tech, i) => (
          <FadeIn key={tech.name} delay={0.05 * i}>
            <div className="glass rounded-xl p-4 sm:p-5 text-center glass-hover transition-all">
              <div className={`text-lg sm:text-xl font-bold ${tech.color}`}>
                {tech.name}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{tech.role}</div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ── Try It ──────────────────────────────────────────────────────────────

function TryIt() {
  return (
    <Section id="try-it">
      <FadeIn>
        <div className="glass rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-brand-400/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
              Get Started
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Try It Yourself
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto mb-8 text-sm sm:text-base">
              Clone the repo, add your OpenAI key and a DuckDB database, and
              start asking questions in seconds.
            </p>

            <div className="max-w-md mx-auto glass rounded-xl p-4 mb-8 text-left">
              <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="ml-2 font-mono">terminal</span>
              </div>
              <pre className="text-xs sm:text-sm font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                <span className="text-zinc-500"># Clone & install</span>
                {"\n"}git clone https://github.com/pavanvzm/SQL-Analytics-Agent.git
                {"\n"}cd SQL-Analytics-Agent
                {"\n"}pip install -r requirements.txt
                {"\n"}{"\n"}
                <span className="text-zinc-500"># Set your OpenAI key</span>
                {"\n"}export OPENAI_API_KEY=sk-...
                {"\n"}{"\n"}
                <span className="text-zinc-500"># Run the app</span>
                {"\n"}streamlit run app.py
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="./TestWebsite/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all hover:shadow-xl hover:shadow-brand-500/25 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Launch Web Playground
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/pavanvzm/SQL-Analytics-Agent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover text-zinc-300 font-medium transition-all active:scale-95"
              >
                <GithubIcon className="w-4 h-4" />
                Get Started on GitHub
              </a>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────

const stats = [
  { value: "7", label: "Pipeline Steps" },
  { value: "3", label: "Max Retries" },
  { value: "10s", label: "Query Timeout" },
  { value: "90+", label: "Tests Passing" },
];

function Stats() {
  return (
    <Section className="py-12 sm:py-16">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <FadeIn key={stat.label} delay={0.1 * i}>
            <div className="glass rounded-xl p-5 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gradient">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-zinc-500 mt-1">{stat.label}</div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold text-white">
              SA
            </div>
            <span className="text-sm text-zinc-400">
              SQL Analytics Agent
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-600">
            <a
              href="https://github.com/pavanvzm/SQL-Analytics-Agent"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              <GithubIcon className="w-4 h-4 inline mr-1" />
              GitHub
            </a>
            <span>MIT License</span>
            <span>Built with Streamlit · DuckDB · LangChain</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── App ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <TechStack />
      <TryIt />
      <Footer />
    </div>
  );
}
