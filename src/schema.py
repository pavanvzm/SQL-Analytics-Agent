"""Schema discovery — introspects a DuckDB database and caches results."""

import functools
from typing import Any

import duckdb


@functools.lru_cache(maxsize=4)
def discover_schema(db_path: str) -> dict[str, Any]:
    """Connect to a DuckDB database and return a structured schema.

    Returns a dict with:
        - ``tables``: list of table names
        - ``columns``: dict mapping table name → list of (col_name, col_type) tuples
        - ``row_counts``: dict mapping table name → approximate row count
        - ``relationships``: list of inferred foreign-key-like relationships (by name)
    """
    conn = duckdb.connect(db_path, read_only=True)

    schema: dict[str, Any] = {
        "tables": [],
        "columns": {},
        "row_counts": {},
        "relationships": [],
    }

    # Get all user tables / views
    tables = conn.execute(
        "SELECT table_name, table_type FROM information_schema.tables "
        "WHERE table_schema = 'main' AND table_type IN ('BASE TABLE', 'VIEW') "
        "ORDER BY table_name"
    ).fetchall()

    for table_name, table_type in tables:
        schema["tables"].append(table_name)

        # Columns
        cols = conn.execute(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema = 'main' AND table_name = ? "
            "ORDER BY ordinal_position",
            [table_name],
        ).fetchall()
        schema["columns"][table_name] = [(c[0], c[1]) for c in cols]

        # Row count
        try:
            count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
            schema["row_counts"][table_name] = count
        except Exception:
            schema["row_counts"][table_name] = -1

    # Infer relationships by column naming patterns (e.g. user_id → users.id)
    for table_name in schema["tables"]:
        cols = schema["columns"].get(table_name, [])
        for col_name, _col_type in cols:
            if col_name.lower().endswith("_id"):
                stem = col_name[:-3]
                # Look for a table named after the stem (possibly pluralised)
                candidates = [stem, stem + "s", stem + "es", stem + "ies"]
                for candidate in candidates:
                    if candidate in schema["tables"]:
                        schema["relationships"].append(
                            {
                                "from_table": table_name,
                                "from_column": col_name,
                                "to_table": candidate,
                                "to_column": "id",
                            }
                        )
                        break

    conn.close()
    return schema


def format_schema_for_llm(schema: dict[str, Any]) -> str:
    """Format the discovered schema into a human-readable string for LLM context."""
    lines: list[str] = ["### Database Schema\n"]

    for table in schema["tables"]:
        lines.append(f"**Table:** {table}")
        cols = schema["columns"].get(table, [])
        for col_name, col_type in cols:
            lines.append(f"  - `{col_name}` ({col_type})")
        count = schema["row_counts"].get(table, -1)
        lines.append(f"  - _~{count} rows_")
        lines.append("")

    if schema["relationships"]:
        lines.append("### Inferred Relationships\n")
        for rel in schema["relationships"]:
            lines.append(
                f"- {rel['from_table']}.{rel['from_column']} → "
                f"{rel['to_table']}.{rel['to_column']}"
            )
        lines.append("")

    return "\n".join(lines)
