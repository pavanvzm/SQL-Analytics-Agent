# SQL Analytics Agent — Dynamic Query Validation

A natural-language-to-SQL analytics agent with dynamic query validation.  
Ask questions about your data in plain English and get results as tables, charts, and plain-English summaries — all with built-in SQL safety guards.

## How It Works

```
Natural Language → [LLM generates SQL] → [SQLGlot validates] → [DuckDB executes] → [Plotly charts + Summary]
                         ↑                    ↓  error                ↓
                         └────── Retry (max 3) ←───────┘
```

1. **Schema Discovery** — Automatically introspects your DuckDB database to find tables, columns, types, and relationships.
2. **SQL Generation** — An LLM (OpenAI) converts your question into SQL using the schema as context.
3. **SQL Validation** — `SQLGlot` parses the generated SQL. Only `SELECT` statements are allowed. Syntax errors are caught immediately.
4. **Sandboxed Execution** — DuckDB runs the query in read-only mode with a 10-second timeout, returning at most 1,000 rows.
5. **Self-Healing Loop** — If validation or execution fails, the error is fed back to the LLM for up to 3 automatic retries.
6. **Visualization & Summary** — Charts are auto-selected (bar, line, or pie) based on data shape. A plain-English insight is generated alongside.

## Tech Stack

| Layer | Tool |
|---|---|
| UI | [Streamlit](https://streamlit.io) |
| LLM Framework | [LangChain](https://python.langchain.com) |
| LLM Provider | [OpenAI](https://openai.com) (`gpt-4o` / `gpt-4o-mini`) |
| SQL Parser | [SQLGlot](https://github.com/tobymao/sqlglot) |
| Query Engine | [DuckDB](https://duckdb.org) (embedded, read-only) |
| Charts | [Plotly](https://plotly.com/python) |
| Data | [Pandas](https://pandas.pydata.org) |

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd sql-analytics-agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set your OpenAI key

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-...
```

Or export it directly:

```bash
export OPENAI_API_KEY=sk-...
```

### 3. Place your database

Put a DuckDB database file (`.db` or `.duckdb`) in the project root, or configure the path in the Streamlit sidebar at runtime.

### 4. Run the app

```bash
streamlit run app.py
```

## Project Structure

```
├── app.py                 # Streamlit UI
├── src/
│   ├── __init__.py
│   ├── schema.py          # Database schema discovery & caching
│   ├── validator.py       # SQLGlot parsing & security validation
│   ├── executor.py        # Sandboxed DuckDB execution
│   ├── agent.py           # Core self-healing loop
│   ├── viz.py             # Auto-selected Plotly charts
│   └── summary.py         # Plain-English insight generation
├── requirements.txt
├── .gitignore
└── README.md
```

## Configuration

| Env Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model name |
| `DB_PATH` | No | `data.db` | Default DuckDB path |
| `MAX_RETRIES` | No | `3` | Max SQL correction attempts |
| `QUERY_TIMEOUT` | No | `10` | Query timeout in seconds |
| `MAX_ROWS` | No | `1000` | Max rows returned |
