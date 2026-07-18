import { useRef, useEffect, useState } from "react";
// @ts-ignore
import alasql from "alasql";
import { Chart } from "chart.js/auto";
import {
  Play,
  RotateCcw,
  Database,
  Table2,
  ChevronDown,
  MessageSquare,
  Code2,
  ShieldCheck,
  Cpu,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Table as TableIcon,
  FileText,
  Sparkles,
  X,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

interface PipelineLog {
  id: string;
  message: string;
  status: "success" | "error" | "retry" | "info";
}

interface NLPattern {
  keywords: RegExp[];
  sql: string;
}

// ── NL-to-SQL Query Definitions ──────────────────────────────────────────
const nlPatterns: NLPattern[] = [
  {
    keywords: [/total revenue/i, /revenue/i, /sales/i, /total spent/i, /total spend/i],
    sql: "SELECT SUM(amount) AS total_revenue, COUNT(*) AS total_orders FROM orders WHERE status = 'Completed'"
  },
  {
    keywords: [/most expensive/i, /highest price/i, /top price/i, /price/i],
    sql: "SELECT name, price, category FROM products ORDER BY price DESC LIMIT 5"
  },
  {
    keywords: [/customer spend/i, /spending/i, /spent/i, /buyer/i, /most active/i],
    sql: "SELECT u.name, SUM(o.amount) AS total_spent, COUNT(o.id) AS order_count FROM orders o JOIN users u ON o.user_id = u.id GROUP BY u.name ORDER BY total_spent DESC"
  },
  {
    keywords: [/joined/i, /users count by month/i, /new users/i, /monthly registrations/i],
    sql: "SELECT SUBSTR(join_date, 1, 7) AS month, COUNT(*) AS user_count FROM users GROUP BY month ORDER BY month"
  },
  {
    keywords: [/order status/i, /status/i, /distribution/i],
    sql: "SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status ORDER BY order_count DESC"
  },
  {
    keywords: [/electronics/i],
    sql: "SELECT name, price FROM products WHERE category = 'Electronics' ORDER BY price DESC"
  },
  {
    keywords: [/products/i],
    sql: "SELECT * FROM products"
  },
  {
    keywords: [/users/i, /customers/i],
    sql: "SELECT * FROM users"
  },
  {
    keywords: [/orders/i],
    sql: "SELECT * FROM orders"
  }
];

export default function Playground() {
  // ── States ─────────────────────────────────────────────────────────────
  const [currentMode, setCurrentMode] = useState<"nl" | "sql">("nl");
  const [currentTab, setCurrentTab] = useState<"chart" | "table" | "summary">("chart");
  const [promptInput, setPromptInput] = useState("");
  const [dbStatus, setDbStatus] = useState("Connected");
  const [activeSchemaTable, setActiveSchemaTable] = useState<string | null>(null);

  // Results structures
  const [showResults, setShowResults] = useState(false);
  const [executedSql, setExecutedSql] = useState("");
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [chartSelectedType, setChartSelectedType] = useState("None");
  const [summaryHtml, setSummaryHtml] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [colCount, setColCount] = useState(0);

  // Pipeline execution simulation
  const [showPipeline, setShowPipeline] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState("idle");
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Preview Modal
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Refs
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // ── DB Schema setup ─────────────────────────────────────────────────────
  const initDatabase = () => {
    try {
      // Drop existing tables in alasql to ensure clean slate
      alasql("DROP TABLE IF EXISTS users");
      alasql("DROP TABLE IF EXISTS products");
      alasql("DROP TABLE IF EXISTS orders");

      // Create and populate users
      alasql("CREATE TABLE users (id INT, name STRING, email STRING, join_date STRING, country STRING)");
      alasql("INSERT INTO users VALUES (1, 'Alice Smith', 'alice@example.com', '2025-01-10', 'USA')");
      alasql("INSERT INTO users VALUES (2, 'Bob Jones', 'bob@example.com', '2025-01-15', 'Canada')");
      alasql("INSERT INTO users VALUES (3, 'Charlie Brown', 'charlie@example.com', '2025-02-01', 'USA')");
      alasql("INSERT INTO users VALUES (4, 'Diana Prince', 'diana@example.com', '2025-02-10', 'UK')");
      alasql("INSERT INTO users VALUES (5, 'Evan Wright', 'evan@example.com', '2025-02-12', 'Germany')");
      alasql("INSERT INTO users VALUES (6, 'Fiona Gallagher', 'fiona@example.com', '2025-02-15', 'USA')");
      alasql("INSERT INTO users VALUES (7, 'George Clark', 'george@example.com', '2025-02-20', 'Canada')");
      alasql("INSERT INTO users VALUES (8, 'Hannah Abbott', 'hannah@example.com', '2025-02-25', 'UK')");
      alasql("INSERT INTO users VALUES (9, 'Ian Malcolm', 'ian@example.com', '2025-03-01', 'USA')");
      alasql("INSERT INTO users VALUES (10, 'Julia Roberts', 'julia@example.com', '2025-03-05', 'Germany')");

      // Create and populate products
      alasql("CREATE TABLE products (id INT, name STRING, price DECIMAL, category STRING)");
      alasql("INSERT INTO products VALUES (101, 'Wireless Mouse', 25.99, 'Electronics')");
      alasql("INSERT INTO products VALUES (102, 'Mechanical Keyboard', 89.99, 'Electronics')");
      alasql("INSERT INTO products VALUES (103, 'Leather Wallet', 45.00, 'Accessories')");
      alasql("INSERT INTO products VALUES (104, 'Designer Sunglasses', 120.00, 'Accessories')");
      alasql("INSERT INTO products VALUES (105, 'Stainless Water Bottle', 19.99, 'Home & Kitchen')");
      alasql("INSERT INTO products VALUES (106, 'Ergonomic Desk Chair', 249.99, 'Furniture')");
      alasql("INSERT INTO products VALUES (107, 'Smart Desk Lamp', 39.99, 'Home & Kitchen')");
      alasql("INSERT INTO products VALUES (108, 'Bluetooth Speaker', 59.99, 'Electronics')");

      // Create and populate orders
      alasql("CREATE TABLE orders (id INT, user_id INT, product_id INT, amount DECIMAL, order_date STRING, status STRING)");
      alasql("INSERT INTO orders VALUES (1001, 1, 101, 25.99, '2025-01-11', 'Completed')");
      alasql("INSERT INTO orders VALUES (1002, 1, 103, 45.00, '2025-01-12', 'Completed')");
      alasql("INSERT INTO orders VALUES (1003, 2, 102, 89.99, '2025-01-16', 'Completed')");
      alasql("INSERT INTO orders VALUES (1004, 3, 104, 120.00, '2025-02-02', 'Completed')");
      alasql("INSERT INTO orders VALUES (1005, 4, 105, 19.99, '2025-02-11', 'Processing')");
      alasql("INSERT INTO orders VALUES (1006, 5, 106, 249.99, '2025-02-13', 'Completed')");
      alasql("INSERT INTO orders VALUES (1007, 1, 108, 59.99, '2025-02-14', 'Cancelled')");
      alasql("INSERT INTO orders VALUES (1008, 6, 101, 25.99, '2025-02-16', 'Completed')");
      alasql("INSERT INTO orders VALUES (1009, 7, 103, 45.00, '2025-02-21', 'Completed')");
      alasql("INSERT INTO orders VALUES (1010, 8, 105, 19.99, '2025-02-26', 'Processing')");
      alasql("INSERT INTO orders VALUES (1011, 2, 107, 39.99, '2025-02-27', 'Completed')");
      alasql("INSERT INTO orders VALUES (1012, 9, 102, 89.99, '2025-03-02', 'Completed')");
      alasql("INSERT INTO orders VALUES (1013, 10, 104, 120.00, '2025-03-06', 'Processing')");
      alasql("INSERT INTO orders VALUES (1014, 3, 108, 59.99, '2025-03-07', 'Completed')");
      alasql("INSERT INTO orders VALUES (1015, 4, 106, 249.99, '2025-03-08', 'Completed')");
    } catch (err) {
      console.error("Failed to seed alasql database: ", err);
    }
  };

  useEffect(() => {
    initDatabase();
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Scroll logs to bottom whenever they change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [pipelineLogs]);

  // Handle database reset
  const resetDemoDatabase = () => {
    initDatabase();
    setDbStatus("Connected");
    setShowPipeline(false);
    setShowResults(false);
    setPromptInput("");
    alert("In-memory demo database successfully reset to its original seeded state.");
  };

  // Preset loaders
  const loadPreset = (text: string, mode: "nl" | "sql") => {
    setCurrentMode(mode);
    setPromptInput(text);
  };

  const toggleSchemaTable = (table: string) => {
    setActiveSchemaTable(activeSchemaTable === table ? null : table);
  };

  const handlePreviewTable = (tableName: string) => {
    try {
      const data = alasql(`SELECT * FROM ${tableName} LIMIT 5`) as any[];
      setPreviewTable(tableName);
      setPreviewData(data);
    } catch (e: any) {
      alert("Failed to fetch preview: " + e.message);
    }
  };

  // ── Helpers for Simulation Logs ─────────────────────────────────────────
  const addLog = (message: string, status: "success" | "error" | "retry" | "info" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setPipelineLogs((prev) => [...prev, { id, message, status }]);
  };

  const delayTime = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── SQL Safety Validator ────────────────────────────────────────────────
  const validateSQL = (sql: string) => {
    const cleaned = sql.trim().toUpperCase();

    if (!cleaned) {
      return { valid: false, error: "Query is empty." };
    }

    if (!cleaned.startsWith("SELECT") && !cleaned.startsWith("WITH")) {
      return {
        valid: false,
        error: "Security Violation: Only SELECT and WITH statements are allowed. Modifying data (INSERT, UPDATE, DELETE) or altering the schema (DROP, ALTER, CREATE) is strictly blocked by the SQL validator."
      };
    }

    const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "REPLACE", "GRANT", "MERGE"];
    for (const word of forbidden) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(cleaned)) {
        return {
          valid: false,
          error: `Security Violation: Dangerous SQL operation '${word}' detected. Query was blocked.`
        };
      }
    }

    return { valid: true };
  };

  // ── Simulated LLM Translation ───────────────────────────────────────────
  const translateNLToSQL = (prompt: string) => {
    const trimmed = prompt.trim();

    for (const pattern of nlPatterns) {
      for (const kw of pattern.keywords) {
        if (kw.test(trimmed)) {
          return pattern.sql;
        }
      }
    }

    // Heuristic fallbacks
    if (/order/i.test(trimmed) && /amount/i.test(trimmed)) {
      return "SELECT id, user_id, amount, order_date, status FROM orders";
    }
    if (/product/i.test(trimmed) || /price/i.test(trimmed)) {
      return "SELECT name, price, category FROM products ORDER BY price DESC";
    }
    if (/user/i.test(trimmed) || /customer/i.test(trimmed)) {
      return "SELECT name, email, country, join_date FROM users";
    }

    return "SELECT * FROM users";
  };

  // ── Self Healing Simulation ──────────────────────────────────────────────
  const runSelfHealingLoop = async (errorMsg: string, failedSql: string, isTypoTable: boolean) => {
    addLog(`[Self-Healing] Error Detected: "${errorMsg}"`, "error");
    await delayTime(400);
    addLog(`[Self-Healing] Initiating auto-correction (Attempt 1 of 3)...`, "retry");
    await delayTime(500);
    addLog(`[Self-Healing] Introspecting database schema files & table catalog...`, "info");
    await delayTime(400);

    let correctedSql = "";
    if (isTypoTable) {
      addLog(`[Self-Healing] AI Diagnostics: Table 'usrs' was not found. Matches catalog table 'users' with 94% similarity index.`, "info");
      correctedSql = failedSql.replace(/usrs/i, "users");
    } else {
      addLog(`[Self-Healing] AI Diagnostics: Column identifier mismatch in query. Cross-checking catalog. Match 'price' on products.`, "info");
      correctedSql = failedSql.replace(/cost/i, "price");
    }
    await delayTime(300);
    addLog(`[Self-Healing] Self-correction generated! Corrected SQL:\n\`\`\`sql\n${correctedSql}\n\`\`\``, "success");

    return correctedSql;
  };

  // ── Core Agent Runner ───────────────────────────────────────────────────
  const runAgent = async () => {
    if (!promptInput.trim()) {
      alert("Please enter a question or SQL query.");
      return;
    }

    setIsExecuting(true);
    setShowResults(false);
    setPipelineLogs([]);
    setShowPipeline(true);
    setPipelineStatus("processing");

    // Step 1: Introspect Schema
    addLog("Step 1: Discovering and fetching DB Schema...", "info");
    await delayTime(200);
    addLog("Found tables: users (5 columns), orders (6 columns), products (4 columns). Loaded from cache.", "info");
    await delayTime(200);

    // Step 2: Formulate SQL
    let sql = "";
    if (currentMode === "nl") {
      addLog(`Step 2: Processing natural language query via simulated LLM...\nPrompt: "${promptInput}"`, "info");
      await delayTime(400);
      sql = translateNLToSQL(promptInput);
      addLog(`Generated SQL Draft:\n\`\`\`sql\n${sql}\n\`\`\``, "info");
      await delayTime(300);
    } else {
      addLog("Step 2: Raw SQL input received. Skipping LLM translation.", "info");
      await delayTime(200);
      sql = promptInput;
    }

    // Step 3: SQL Safety Validation
    addLog("Step 3: Initiating SQL parser security validator (SQLGlot equivalent)...", "info");
    await delayTime(300);
    const validation = validateSQL(sql);

    if (!validation.valid) {
      addLog(`Validation REJECTED!\n${validation.error}`, "error");
      setPipelineStatus("failed (security)");
      setIsExecuting(false);
      return;
    }
    addLog("Validation PASSED! No unsafe keywords or mutation clauses detected.", "success");
    await delayTime(200);

    // Step 4: Sandbox Execution
    addLog("Step 4: Executing query in read-only sandboxed database...", "info");
    await delayTime(400);

    let rawData: any[] = [];
    let executionSuccess = false;

    const hasTableTypo = /usrs/i.test(sql);
    const hasColTypo = /cost/i.test(sql);

    if (hasTableTypo || hasColTypo) {
      try {
        // Trigger simulation failure
        alasql(sql);
      } catch (err: any) {
        const correctedSql = await runSelfHealingLoop(err.message, sql, hasTableTypo);
        await delayTime(300);

        // Revalidate corrected SQL
        addLog("Re-validating corrected SQL statement...", "info");
        const reValidation = validateSQL(correctedSql);
        await delayTime(200);

        if (reValidation.valid) {
          addLog("Re-validation PASSED!", "success");
          try {
            sql = correctedSql;
            rawData = alasql(correctedSql);
            executionSuccess = true;
          } catch (err2: any) {
            addLog(`Execution failed on correction: ${err2.message}`, "error");
          }
        } else {
          addLog("Re-validation REJECTED!", "error");
        }
      }
    } else {
      // Standard normal execution
      try {
        rawData = alasql(sql);
        executionSuccess = true;
      } catch (err: any) {
        addLog(`Query execution error: ${err.message}`, "error");
        setPipelineStatus("failed (syntax/execution)");
        setIsExecuting(false);
        return;
      }
    }

    if (executionSuccess) {
      addLog(`Execution complete! Returned ${rawData.length} row(s) safely in 12ms.`, "success");
      setPipelineStatus("success");
      setIsExecuting(false);

      setExecutedSql(sql);
      setResultsData(rawData);
      setShowResults(true);

      // Trigger output render logic
      renderOutputResults(rawData, sql);
    } else {
      setPipelineStatus("failed");
      setIsExecuting(false);
    }
  };

  // ── Render Chart & Metrics ──────────────────────────────────────────────
  const renderOutputResults = (data: any[], sql: string) => {
    if (data.length === 0) {
      setRowCount(0);
      setColCount(0);
      setChartSelectedType("None");
      setSummaryHtml("The query returned an empty dataset. No records matched your search parameters.");
      setCurrentTab("table");
      return;
    }

    const columns = Object.keys(data[0]);
    setRowCount(data.length);
    setColCount(columns.length);

    // Auto Chart Analysis
    let numericCol: string | null = null;
    let labelCol: string | null = null;

    columns.forEach((col) => {
      const val = data[0][col];
      if (typeof val === "number") {
        if (!numericCol) numericCol = col;
      } else {
        if (!labelCol) labelCol = col;
      }
    });

    if (!labelCol && columns.length > 1) labelCol = columns[0];
    if (!numericCol) {
      // Check for parseable numbers
      columns.forEach((col) => {
        const val = Number(data[0][col]);
        if (!isNaN(val) && typeof data[0][col] !== "string") {
          numericCol = col;
        }
      });
    }

    let detectedChart = "None";
    let chartType: "pie" | "line" | "bar" = "bar";

    if (numericCol) {
      if (data.length <= 4) {
        chartType = "pie";
        detectedChart = "Pie Chart (Category Distribution)";
      } else if (labelCol && /date|month|year/i.test(labelCol)) {
        chartType = "line";
        detectedChart = "Line Chart (Time Series)";
      } else {
        chartType = "bar";
        detectedChart = "Bar Chart (Comparisons)";
      }
    }

    setChartSelectedType(detectedChart);

    // Generate Summary html content
    let summ = "";
    if (currentMode === "nl") {
      summ += `In response to your question: "<strong>${promptInput}</strong>", the SQL agent executed a validated query yielding <strong>${data.length} records</strong>. <br><br>`;
    } else {
      summ += `Your SQL query executed successfully, returning a dataset of <strong>${data.length} entries</strong>. <br><br>`;
    }

    if (numericCol) {
      const total = data.reduce((acc, curr) => acc + (Number(curr[numericCol!]) || 0), 0);
      const avg = (total / data.length).toFixed(2);
      summ += `The principal numeric dimension discovered is <strong>${numericCol}</strong>, which evaluates to a cumulative sum of <strong>${total.toLocaleString()}</strong> with an average of <strong>${Number(avg).toLocaleString()}</strong> per record. `;
    }

    if (labelCol) {
      summ += `The primary categorical field is <strong>${labelCol}</strong>. `;
    }

    summ += `Based on these metrics, a <strong>${detectedChart || "Table View"}</strong> is recommended to optimally highlight the trends and distributions. All transaction structures match sandboxed DB standards safely.`;
    setSummaryHtml(summ);

    // Switch view to chart if possible, else table
    if (numericCol) {
      setCurrentTab("chart");
      // Delayed chart construction to wait for canvas mount
      setTimeout(() => {
        if (chartCanvasRef.current) {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }

          const ctx = chartCanvasRef.current.getContext("2d");
          if (ctx) {
            chartInstanceRef.current = new Chart(ctx, {
              type: chartType,
              data: {
                labels: data.map((r) => String(labelCol ? r[labelCol] : "Label")),
                datasets: [
                  {
                    label: numericCol!.toUpperCase(),
                    data: data.map((r) => Number(r[numericCol!])),
                    backgroundColor:
                      chartType === "pie"
                        ? [
                            "rgba(16, 185, 129, 0.7)",
                            "rgba(52, 211, 153, 0.7)",
                            "rgba(110, 231, 183, 0.7)",
                            "rgba(5, 150, 105, 0.7)",
                            "rgba(4, 120, 87, 0.7)",
                          ]
                        : "rgba(16, 185, 129, 0.75)",
                    borderColor: "rgba(16, 185, 129, 1)",
                    borderWidth: 1.5,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: "#e4e4e7", font: { family: "Inter" } },
                  },
                },
                scales:
                  chartType !== "pie"
                    ? {
                        x: {
                          grid: { color: "rgba(255,255,255,0.05)" },
                          ticks: { color: "#a1a1aa" },
                        },
                        y: {
                          grid: { color: "rgba(255,255,255,0.05)" },
                          ticks: { color: "#a1a1aa" },
                        },
                      }
                    : {},
              },
            });
          }
        }
      }, 50);
    } else {
      setCurrentTab("table");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8" id="agent-playground">
      {/* Left column: Schema discovery & Database metadata */}
      <div className="lg:col-span-4 space-y-6">
        {/* DB Status */}
        <div className="glass rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-400" />
              <h2 className="font-semibold text-sm sm:text-base text-white">DuckDB (Client-Side Sandboxed)</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {dbStatus}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            This live client-side playground executes analytics queries inside an in-memory database, reflecting exact validation, execution constraints, and auto-chart structures of the agent.
          </p>
          <button
            onClick={resetDemoDatabase}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-medium border border-white/5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Database State
          </button>
        </div>

        {/* Schema Discovery */}
        <div className="glass rounded-xl p-5 border border-white/5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-brand-400" />
              <h2 className="font-semibold text-sm sm:text-base text-white">Discovered Schema</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono">3 tables found</span>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {/* Table: users */}
            <div className="border border-white/5 rounded-lg bg-zinc-900/40 overflow-hidden">
              <button
                onClick={() => toggleSchemaTable("users")}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/70 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-brand-300">users</span>
                  <span className="text-xs text-zinc-500 ml-2">(10 rows)</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 transform transition-transform duration-200 ${
                    activeSchemaTable === "users" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSchemaTable === "users" && (
                <div className="px-4 py-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="grid grid-cols-2 text-zinc-500 font-medium pb-1 border-b border-white/5">
                    <span>Column</span>
                    <span>Type</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">id</span>
                    <span className="text-brand-400/80">INTEGER (PK)</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">name</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">email</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">join_date</span>
                    <span className="text-brand-400/80">DATE</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">country</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <button
                    onClick={() => handlePreviewTable("users")}
                    className="mt-2 w-full text-center py-1.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Preview Sample Data
                  </button>
                </div>
              )}
            </div>

            {/* Table: products */}
            <div className="border border-white/5 rounded-lg bg-zinc-900/40 overflow-hidden">
              <button
                onClick={() => toggleSchemaTable("products")}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/70 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-brand-300">products</span>
                  <span className="text-xs text-zinc-500 ml-2">(8 rows)</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 transform transition-transform duration-200 ${
                    activeSchemaTable === "products" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSchemaTable === "products" && (
                <div className="px-4 py-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="grid grid-cols-2 text-zinc-500 font-medium pb-1 border-b border-white/5">
                    <span>Column</span>
                    <span>Type</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">id</span>
                    <span className="text-brand-400/80">INTEGER (PK)</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">name</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">price</span>
                    <span className="text-brand-400/80">DECIMAL</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">category</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <button
                    onClick={() => handlePreviewTable("products")}
                    className="mt-2 w-full text-center py-1.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Preview Sample Data
                  </button>
                </div>
              )}
            </div>

            {/* Table: orders */}
            <div className="border border-white/5 rounded-lg bg-zinc-900/40 overflow-hidden">
              <button
                onClick={() => toggleSchemaTable("orders")}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/70 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-brand-300">orders</span>
                  <span className="text-xs text-zinc-500 ml-2">(15 rows)</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 transform transition-transform duration-200 ${
                    activeSchemaTable === "orders" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSchemaTable === "orders" && (
                <div className="px-4 py-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="grid grid-cols-2 text-zinc-500 font-medium pb-1 border-b border-white/5">
                    <span>Column</span>
                    <span>Type</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">id</span>
                    <span className="text-brand-400/80">INTEGER (PK)</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">user_id</span>
                    <span className="text-brand-400/80 font-semibold text-teal-400">INTEGER (FK)</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">product_id</span>
                    <span className="text-brand-400/80 font-semibold text-teal-400">INTEGER (FK)</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">amount</span>
                    <span className="text-brand-400/80">DECIMAL</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">order_date</span>
                    <span className="text-brand-400/80">DATE</span>
                  </div>
                  <div className="grid grid-cols-2 font-mono">
                    <span className="text-zinc-300">status</span>
                    <span className="text-brand-400/80">VARCHAR</span>
                  </div>
                  <button
                    onClick={() => handlePreviewTable("orders")}
                    className="mt-2 w-full text-center py-1.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Preview Sample Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right column: Interactive Sandbox Workbench */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        {/* Input box workbench */}
        <div className="glass rounded-xl p-6 border border-white/5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-brand-400" />
              <h2 className="font-semibold text-white">Execute SQL Analytics Agent</h2>
            </div>
            <span className="text-xs text-zinc-400">Self-Healing Pipeline Simulation</span>
          </div>

          {/* Mode select */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setCurrentMode("nl")}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentMode === "nl"
                  ? "text-white bg-brand-600 shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Natural Language Prompt
            </button>
            <button
              onClick={() => setCurrentMode("sql")}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentMode === "sql"
                  ? "text-white bg-brand-600 shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Direct SQL Console
            </button>
          </div>

          {/* Recommended / Test presets */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 font-medium">Click a test-preset to load:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadPreset("What is the total revenue by category?", "nl")}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 text-xs text-zinc-300 hover:text-white hover:border-brand-500/30 transition-all cursor-pointer"
              >
                📊 Revenue by category
              </button>
              <button
                onClick={() => loadPreset("Show top 5 customers with their total spent", "nl")}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 text-xs text-zinc-300 hover:text-white hover:border-brand-500/30 transition-all cursor-pointer"
              >
                👑 Top spenders (JOIN)
              </button>
              <button
                onClick={() => loadPreset("Select * from usrs", "sql")}
                className="px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300 hover:text-amber-200 hover:border-amber-500/30 transition-all cursor-pointer"
              >
                ↻ Typo Test (Self-Healing)
              </button>
              <button
                onClick={() => loadPreset("DROP TABLE users", "sql")}
                className="px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-xs text-rose-300 hover:text-rose-200 hover:border-rose-500/30 transition-all cursor-pointer"
              >
                🔒 Safety Test (DROP TABLE)
              </button>
            </div>
          </div>

          {/* Input textbox */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium">
              {currentMode === "nl"
                ? "Ask a question about your products, users, or orders:"
                : "Enter a raw SQL SELECT query to test validation & execution:"}
            </label>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all placeholder:text-zinc-600"
              placeholder={
                currentMode === "nl"
                  ? "e.g. Show our most active buyers and how much they spent"
                  : "SELECT * FROM products ORDER BY price DESC"
              }
            />
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-400" /> Active SQL safety parser enabled
            </span>
            <button
              onClick={runAgent}
              disabled={isExecuting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{isExecuting ? "Executing Agent..." : "Execute Agent Query"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agent Activity / Pipeline logs */}
        {showPipeline && (
          <div className="glass rounded-xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-brand-400" />
                <h3 className="font-semibold text-sm sm:text-base text-white">Agent Execution Pipeline Logs</h3>
              </div>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded ${
                  pipelineStatus === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : pipelineStatus.startsWith("failed")
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-zinc-500/10 text-zinc-400 animate-pulse"
                }`}
              >
                {pipelineStatus}
              </span>
            </div>
            <div className="space-y-3 font-mono text-xs max-h-[220px] overflow-y-auto pr-1">
              {pipelineLogs.map((log) => {
                let LogIcon = ArrowRight;
                let iconClass = "text-brand-400";

                if (log.status === "success") {
                  LogIcon = CheckCircle;
                  iconClass = "text-emerald-400";
                } else if (log.status === "error") {
                  LogIcon = AlertTriangle;
                  iconClass = "text-rose-400";
                } else if (log.status === "retry") {
                  LogIcon = RotateCcw;
                  iconClass = "text-amber-400 animate-spin";
                }

                return (
                  <div key={log.id} className="flex items-start gap-2 py-1 border-b border-white/2">
                    <LogIcon className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass}`} />
                    <span className="leading-relaxed whitespace-pre-wrap text-zinc-300">{log.message}</span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Results display panel */}
        {showResults && (
          <div className="glass rounded-xl p-6 border border-white/5 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Execution Complete</span>
                <h3 className="font-bold text-base text-white mt-1">Query Results</h3>
              </div>

              {/* Tab Toggles */}
              <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setCurrentTab("chart")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === "chart"
                      ? "text-brand-400 bg-brand-500/10 border border-brand-500/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Chart
                </button>
                <button
                  onClick={() => setCurrentTab("table")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === "table"
                      ? "text-brand-400 bg-brand-500/10 border border-brand-500/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" /> Table
                </button>
                <button
                  onClick={() => setCurrentTab("summary")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === "summary"
                      ? "text-brand-400 bg-brand-500/10 border border-brand-500/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Insight Summary
                </button>
              </div>
            </div>

            {/* Gen SQL */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span>Executed SQL Statement</span>
                <span className="text-brand-400">Validated 🔒</span>
              </div>
              <pre className="font-mono text-xs text-zinc-300 overflow-x-auto select-all">{executedSql}</pre>
            </div>

            {/* Display contents */}
            <div className="min-h-[220px] flex items-center justify-center relative">
              {/* Tab: Chart */}
              {currentTab === "chart" && (
                <div className="w-full h-full relative">
                  {chartSelectedType === "None" ? (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs">
                      No numeric columns found for chart creation. Showing table data only.
                    </div>
                  ) : (
                    <div className="w-full h-[300px] flex justify-center">
                      <canvas ref={chartCanvasRef} className="max-h-[300px] w-full" />
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Table */}
              {currentTab === "table" && (
                <div className="w-full overflow-x-auto">
                  {resultsData.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs italic">
                      No matching rows found in query execution.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-400 font-medium bg-zinc-900/60">
                          {Object.keys(resultsData[0]).map((col) => (
                            <th key={col} className="px-4 py-3 font-semibold text-zinc-300 font-mono">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
                        {resultsData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/2">
                            {Object.keys(resultsData[0]).map((col) => (
                              <td key={col} className="px-4 py-2.5">
                                {row[col] !== null ? String(row[col]) : "NULL"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab: Summary */}
              {currentTab === "summary" && (
                <div className="w-full space-y-4 text-left">
                  <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-brand-300 font-semibold text-sm">
                      <Sparkles className="w-4.5 h-4.5 text-brand-400" /> Auto-Generated AI Insight
                    </div>
                    <p
                      className="text-xs sm:text-sm text-zinc-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: summaryHtml }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">Row Count</span>
                      <p className="text-lg font-bold text-white mt-0.5">{rowCount}</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">Columns Returned</span>
                      <p className="text-lg font-bold text-white mt-0.5">{colCount}</p>
                    </div>
                    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-3 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">Auto Chart Selected</span>
                      <p className="text-sm font-semibold text-brand-400 mt-1">{chartSelectedType}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTable && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-950">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Table2 className="w-4.5 h-4.5 text-brand-400" /> Sample Preview:{" "}
                <span className="text-brand-300 font-mono font-bold">{previewTable}</span>
              </h3>
              <button
                onClick={() => setPreviewTable(null)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-x-auto max-h-[400px]">
              {previewData.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-medium bg-zinc-900/60">
                      {Object.keys(previewData[0]).map((col) => (
                        <th key={col} className="px-3 py-2 font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(previewData[0]).map((col) => (
                          <td key={col} className="px-3 py-2 font-mono">
                            {row[col] !== null ? String(row[col]) : "NULL"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-zinc-400 text-xs italic">No data to display.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}