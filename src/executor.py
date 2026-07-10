"""Sandboxed query executor — runs DuckDB queries read-only with safety guards."""

import signal
from contextlib import contextmanager
from typing import Optional

import duckdb
import pandas as pd


class QueryTimeoutError(TimeoutError):
    """Raised when a query exceeds the allowed execution time."""


@contextmanager
def _timeout(seconds: int):
    """Context manager that raises ``QueryTimeoutError`` after *seconds*."""

    def _handler(_signum, _frame):
        raise QueryTimeoutError(f"Query timed out after {seconds}s.")

    original = signal.signal(signal.SIGALRM, _handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, original)


def execute_query(
    db_path: str,
    sql: str,
    timeout: int = 10,
    max_rows: int = 1000,
) -> tuple[bool, Optional[pd.DataFrame], Optional[str]]:
    """Execute a SQL query against a DuckDB database in read-only mode.

    Args:
        db_path: Path to the DuckDB database file.
        sql: The SQL query to execute.
        timeout: Maximum execution time in seconds.
        max_rows: Maximum number of rows to return.

    Returns:
        A tuple of ``(success, dataframe, error_message)``.
    """
    conn = None
    try:
        conn = duckdb.connect(db_path, read_only=True)

        with _timeout(timeout):
            result = conn.execute(sql)
            df = result.fetchdf()

        if len(df) > max_rows:
            df = df.head(max_rows)

        return True, df, None

    except QueryTimeoutError as exc:
        return False, None, str(exc)
    except duckdb.CatalogException as exc:
        return False, None, f"Table/column not found: {exc}"
    except duckdb.BinderException as exc:
        return False, None, f"Binding error: {exc}"
    except duckdb.ParserException as exc:
        return False, None, f"Parse error: {exc}"
    except Exception as exc:
        return False, None, f"Execution error: {exc}"
    finally:
        if conn:
            conn.close()
