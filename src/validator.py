"""SQL validator — parses SQL with SQLGlot and enforces read-only SELECT."""

from typing import Optional

import sqlglot
from sqlglot import exp


def validate_sql(sql: str) -> tuple[bool, str, Optional[str]]:
    """Validate a SQL statement.

    Args:
        sql: Raw SQL string to validate.

    Returns:
        A tuple of ``(is_valid, message, parsed_sql)``.
        ``parsed_sql`` is a pretty-printed version of the SQL on success, or
        ``None`` on failure.
    """
    if not sql or not sql.strip():
        return False, "Empty SQL statement.", None

    try:
        parsed = sqlglot.parse_one(sql)
    except (sqlglot.errors.ParseError, Exception) as exc:
        return False, f"Syntax error: {exc}", None

    # Must be a SELECT statement (or a CTE ending in SELECT)
    if not isinstance(parsed, exp.Select):
        statement_type = type(parsed).__name__
        return (
            False,
            f"Blocked: only SELECT statements are allowed (got {statement_type}).",
            None,
        )

    # Deep-check for forbidden sub-statements (INSERT, UPDATE, DELETE, DROP, etc.)
    forbidden_types = (
        exp.Insert,
        exp.Update,
        exp.Delete,
        exp.Drop,
        exp.Create,
        exp.Alter,
        exp.TruncateTable,
        exp.RenameColumn,
        exp.RenameIndex,
        exp.AlterRename,
        exp.Grant,
        exp.Revoke,
        exp.Merge,
    )
    for node in parsed.find_all(exp.DataType, bfs=False):
        _ = node  # walk the tree

    for node in parsed.find_all(forbidden_types):
        return (
            False,
            f"Blocked: DDL/DML statement `{type(node).__name__}` found inside the query.",
            None,
        )

    pretty = parsed.sql(pretty=True)
    return True, "Valid SELECT statement.", pretty
