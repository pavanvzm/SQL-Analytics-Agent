"""Agent — the core self-healing loop that orchestrates SQL generation, validation, execution, and retry."""

import logging
from typing import Any, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from src.schema import discover_schema, format_schema_for_llm
from src.validator import validate_sql
from src.executor import execute_query

logger = logging.getLogger(__name__)

# ── Skills (modular prompt fragments) ──────────────────────────────────────

SYSTEM_PROMPT = """You are an expert SQL analyst. Given a database schema and a user's question, you generate SQL queries.

Rules:
- Generate ONLY standard SQL that works with DuckDB.
- Use only the tables and columns shown in the schema.
- Output the SQL query inside ```sql ... ``` code fences.
- Never include DDL, DML, or any non-SELECT statement.
- If you need to correct a previous error, study the error message carefully.

Schema:
{schema}
"""

CORRECTION_PROMPT = """The previous SQL query produced an error. Here is the error:

{error}

Here is the SQL that failed:
```sql
{failed_sql}
```

Please generate a corrected SQL query that fixes the issue. Output only the corrected SQL inside ```sql ... ``` code fences."""
# ────────────────────────────────────────────────────────────────────────────


class SchemaSkill:
    """Skill: Discover and cache the database schema."""

    @staticmethod
    def fetch(db_path: str) -> dict[str, Any]:
        return discover_schema(db_path)

    @staticmethod
    def format(schema: dict[str, Any]) -> str:
        return format_schema_for_llm(schema)


class SQLSkill:
    """Skill: Generate SQL from natural language using an LLM."""

    def __init__(self, llm: ChatOpenAI):
        self._llm = llm

    def generate(self, question: str, schema_text: str) -> str:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(schema=schema_text)),
            HumanMessage(content=question),
        ]
        response = self._llm.invoke(messages)
        return self._extract_sql(response.content)

    def correct(self, question: str, schema_text: str, failed_sql: str, error: str) -> str:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(schema=schema_text)),
            HumanMessage(content=CORRECTION_PROMPT.format(error=error, failed_sql=failed_sql)),
        ]
        response = self._llm.invoke(messages)
        return self._extract_sql(response.content)

    @staticmethod
    def _extract_sql(text: str) -> str:
        """Extract SQL from ```sql ... ``` code fences, or return the text as-is."""
        import re

        match = re.search(r"```sql\s*\n?(.*?)\n?```", text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        # Fallback: try to find any SELECT statement
        match = re.search(r"(SELECT\s+.+?;)", text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return text.strip()


class VizSkill:
    """Skill: (placeholder — actual viz logic lives in src/viz.py)."""

    @staticmethod
    def auto_chart(df, sql: str):
        from src.viz import generate_chart  # noqa: F811

        return generate_chart(df, sql)


class SQLAnalyticsAgent:
    """Orchestrator: natural language → SQL → validate → execute → loop.

    The self-healing loop works as follows:

        1. Generate SQL via LLM (with schema context).
        2. Validate SQL with SQLGlot (must be SELECT, no syntax errors).
        3. Execute against DuckDB (read-only, timeout-guarded).
        4. If validation or execution fails, feed the error back to the LLM
           for correction.  Repeat up to ``max_retries`` times.
        5. Return the final result (SQL, DataFrame, error log).
    """

    def __init__(
        self,
        db_path: str,
        openai_api_key: str,
        model: str = "gpt-4o-mini",
        max_retries: int = 3,
        query_timeout: int = 10,
        max_rows: int = 1000,
    ):
        self.db_path = db_path
        self.max_retries = max_retries
        self.query_timeout = query_timeout
        self.max_rows = max_rows

        self._llm = ChatOpenAI(
            model=model,
            openai_api_key=openai_api_key,
            temperature=0.1,
        )
        self._sql_skill = SQLSkill(self._llm)
        self._schema: Optional[dict[str, Any]] = None
        self._schema_text: Optional[str] = None

    def _load_schema(self) -> None:
        """Discover and cache the schema."""
        self._schema = SchemaSkill.fetch(self.db_path)
        self._schema_text = SchemaSkill.format(self._schema)

    def ask(self, question: str) -> dict[str, Any]:
        """Process a natural-language question.

        Args:
            question: The user's question in plain English.

        Returns:
            A dict with keys:
                - ``question``: original question
                - ``sql``: the final SQL query (or last attempted one)
                - ``data``: ``pd.DataFrame`` or ``None``
                - ``success``: ``bool``
                - ``error_log``: list of error messages from the retry loop
                - ``retries``: number of retries performed
        """
        result: dict[str, Any] = {
            "question": question,
            "sql": "",
            "data": None,
            "success": False,
            "error_log": [],
            "retries": 0,
        }

        # 1. Load schema
        try:
            self._load_schema()
        except Exception as exc:
            result["error_log"].append(f"Schema discovery failed: {exc}")
            return result

        if not self._schema or not self._schema.get("tables"):
            result["error_log"].append("No tables found in the database.")
            return result

        # 2. Initial SQL generation
        sql = self._sql_skill.generate(question, self._schema_text)
        result["sql"] = sql

        # 3-4. Self-healing loop
        for attempt in range(self.max_retries + 1):
            # Validate
            is_valid, msg, pretty_sql = validate_sql(sql)
            if not is_valid:
                result["error_log"].append(f"Validation error (attempt {attempt + 1}): {msg}")
                if attempt < self.max_retries:
                    sql = self._sql_skill.correct(question, self._schema_text, sql, msg)
                    result["sql"] = sql
                    result["retries"] += 1
                    continue
                return result

            # Execute
            success, df, error_msg = execute_query(
                self.db_path,
                pretty_sql or sql,
                timeout=self.query_timeout,
                max_rows=self.max_rows,
            )

            if success:
                result["sql"] = pretty_sql or sql
                result["data"] = df
                result["success"] = True
                return result

            # Execution error — retry
            result["error_log"].append(f"Execution error (attempt {attempt + 1}): {error_msg}")
            if attempt < self.max_retries:
                sql = self._sql_skill.correct(
                    question, self._schema_text, sql, error_msg or "Unknown error"
                )
                result["sql"] = sql
                result["retries"] += 1
            else:
                result["sql"] = sql

        return result
