"""Tests for src/executor.py — sandboxed DuckDB query execution."""

import pytest
import duckdb
from src.executor import execute_query, QueryTimeoutError


class TestExecuteQuery:
    """Verify sandboxed execution: read-only, timeout, error handling."""

    # ── Successful execution ───────────────────────────────────────────

    def test_simple_select(self, sample_db_path):
        success, df, err = execute_query(sample_db_path, "SELECT * FROM users")
        assert success is True
        assert err is None
        assert df is not None
        assert len(df) == 4
        assert "name" in df.columns

    def test_select_with_where(self, sample_db_path):
        success, df, _ = execute_query(
            sample_db_path, "SELECT * FROM users WHERE age > 28"
        )
        assert success is True
        assert df is not None
        assert len(df) == 2  # Alice (30) and Charlie (35)

    def test_select_with_join(self, sample_db_path):
        success, df, _ = execute_query(
            sample_db_path,
            "SELECT u.name, o.product FROM users u JOIN orders o ON u.id = o.user_id",
        )
        assert success is True
        assert df is not None
        assert len(df) == 6

    def test_aggregate_query(self, sample_db_path):
        success, df, _ = execute_query(
            sample_db_path,
            "SELECT product, SUM(amount) as total FROM orders GROUP BY product",
        )
        assert success is True
        assert df is not None
        assert "product" in df.columns
        assert "total" in df.columns

    # ── Error handling ─────────────────────────────────────────────────

    def test_nonexistent_table(self, sample_db_path):
        success, df, err = execute_query(
            sample_db_path, "SELECT * FROM nonexistent"
        )
        assert success is False
        assert df is None
        assert err is not None
        assert "not found" in err.lower() or "does not exist" in err.lower()

    def test_nonexistent_column(self, sample_db_path):
        success, df, err = execute_query(
            sample_db_path, "SELECT made_up_col FROM users"
        )
        assert success is False
        assert df is None
        assert err is not None

    def test_invalid_sql_syntax(self, sample_db_path):
        success, df, err = execute_query(sample_db_path, "SELECT FROM")
        assert success is False
        assert df is None
        assert err is not None

    def test_nonexistent_database(self):
        success, df, err = execute_query("/no/such/path.db", "SELECT 1")
        assert success is False
        assert df is None
        assert err is not None

    # ── Read-only enforcement ──────────────────────────────────────────

    def test_insert_rejected(self, sample_db_path):
        success, df, err = execute_query(
            sample_db_path, "INSERT INTO users VALUES (99, 'Test', 't@t.com', 20, '2024-01-01')"
        )
        # DuckDB in read-only mode should reject DML
        assert success is False
        assert df is None
        assert err is not None

    def test_drop_rejected(self, sample_db_path):
        success, df, err = execute_query(sample_db_path, "DROP TABLE users")
        assert success is False
        assert df is None

    # ── Row limit ──────────────────────────────────────────────────────

    def test_max_rows_limits_output(self, sample_db_path):
        _, df, _ = execute_query(
            sample_db_path, "SELECT * FROM orders", max_rows=2
        )
        assert df is not None
        assert len(df) <= 2

    def test_max_rows_default(self, sample_db_path):
        _, df, _ = execute_query(sample_db_path, "SELECT * FROM orders")
        assert df is not None
        # Default is 1000; our sample has 6 rows
        assert len(df) == 6

    # ── Empty result ───────────────────────────────────────────────────

    def test_empty_result(self, sample_db_path):
        success, df, _ = execute_query(
            sample_db_path, "SELECT * FROM logs"
        )
        assert success is True
        assert df is not None
        assert len(df) == 0

    # ── Read-only mode verification ────────────────────────────────────

    def test_read_only_mode_preserved(self, sample_db_path):
        """Verify the database is unchanged after executing a SELECT."""
        import duckdb

        pre = duckdb.connect(sample_db_path, read_only=True)
        pre_count = pre.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        pre.close()

        execute_query(sample_db_path, "SELECT * FROM users")

        post = duckdb.connect(sample_db_path, read_only=True)
        post_count = post.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        post.close()

        assert pre_count == post_count == 4
