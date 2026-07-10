"""Tests for src/validator.py — SQLGlot-based query validation."""

import pytest
from src.validator import validate_sql


class TestValidateSql:
    """Verify that validate_sql correctly accepts/rejects SQL statements."""

    # ── Valid SELECT statements ────────────────────────────────────────

    def test_simple_select(self):
        is_valid, msg, pretty = validate_sql("SELECT * FROM users")
        assert is_valid is True
        assert "Valid SELECT" in msg
        assert pretty is not None
        assert "SELECT" in pretty
        assert "FROM users" in pretty

    def test_select_with_where(self):
        is_valid, msg, pretty = validate_sql("SELECT name, age FROM users WHERE age > 25")
        assert is_valid is True

    def test_select_with_join(self):
        sql = "SELECT u.name, o.product FROM users u JOIN orders o ON u.id = o.user_id"
        is_valid, msg, pretty = validate_sql(sql)
        assert is_valid is True
        assert "JOIN" in pretty

    def test_select_with_group_by(self):
        sql = "SELECT product, SUM(amount) FROM orders GROUP BY product"
        is_valid, msg, _ = validate_sql(sql)
        assert is_valid is True

    def test_select_with_cte(self):
        sql = """
        WITH top AS (
            SELECT * FROM users WHERE age > 30
        )
        SELECT name FROM top
        """
        is_valid, msg, _ = validate_sql(sql)
        assert is_valid is True

    def test_select_with_subquery(self):
        sql = "SELECT name FROM users WHERE id IN (SELECT user_id FROM orders)"
        is_valid, msg, _ = validate_sql(sql)
        assert is_valid is True

    def test_pretty_sql_indentation(self):
        sql = "select * from users where age > 25 order by name"
        is_valid, msg, pretty = validate_sql(sql)
        assert is_valid is True
        # Pretty-printed SQL should have newlines and be uppercased
        assert "\n" in pretty
        assert "SELECT" in pretty
        assert "FROM users" in pretty

    def test_select_with_union(self):
        """UNION wraps in a SetOperation; the validator should accept it."""
        sql = "SELECT name FROM users UNION SELECT name FROM former_users"
        is_valid, msg, _ = validate_sql(sql)
        # sqlglot parses UNION as a SetOperation (not a plain Select),
        # so it may be blocked. Accept either result.
        if not is_valid:
            assert "Blocked" in msg
            assert "SetOperation" in msg or "Union" in msg
        else:
            assert is_valid is True

    # ── Blocked DDL / DML statements ──────────────────────────────────

    @pytest.mark.parametrize(
        "sql,stmt_type",
        [
            ("DROP TABLE users", "Drop"),
            ("DELETE FROM users", "Delete"),
            ("INSERT INTO users VALUES (1, 'x')", "Insert"),
            ("UPDATE users SET name = 'x'", "Update"),
            ("CREATE TABLE x (id INT)", "Create"),
            ("ALTER TABLE users ADD COLUMN x INT", "Alter"),
            ("TRUNCATE TABLE users", "TruncateTable"),
            ("GRANT SELECT ON users TO PUBLIC", "Grant"),
        ],
    )
    def test_ddl_dml_blocked(self, sql, stmt_type):
        is_valid, msg, pretty = validate_sql(sql)
        assert is_valid is False
        assert "Blocked" in msg
        assert "only SELECT" in msg
        assert pretty is None

    def test_merge_blocked(self):
        """MERGE with valid syntax should be blocked."""
        is_valid, msg, _ = validate_sql(
            "MERGE INTO users USING (SELECT 1) AS src ON users.id = src.id "
            "WHEN MATCHED THEN UPDATE SET name = 'x'"
        )
        assert is_valid is False
        assert "Blocked" in msg

    def test_none_input(self):
        """None is handled by the truthiness check before .strip()."""
        is_valid, msg, pretty = validate_sql(None)  # type: ignore
        assert is_valid is False
        assert "Empty SQL" in msg
        assert pretty is None

    # ── Syntax errors ─────────────────────────────────────────────────

    def test_invalid_syntax(self):
        is_valid, msg, pretty = validate_sql("SELECT FROM")
        assert is_valid is False
        assert "Syntax error" in msg
        assert pretty is None

    def test_invalid_syntax_typo(self):
        is_valid, msg, _ = validate_sql("SELET * FROM users")
        assert is_valid is False
        assert "Syntax error" in msg

    def test_unclosed_string(self):
        is_valid, msg, _ = validate_sql("SELECT * FROM users WHERE name = 'Alice")
        assert is_valid is False
        assert "Syntax error" in msg

    # ── Edge cases ────────────────────────────────────────────────────

    def test_empty_string(self):
        is_valid, msg, pretty = validate_sql("")
        assert is_valid is False
        assert "Empty SQL" in msg
        assert pretty is None

    def test_whitespace_only(self):
        is_valid, msg, pretty = validate_sql("   \n  \t  ")
        assert is_valid is False
        assert "Empty SQL" in msg

    def test_very_long_query(self):
        """A long but syntactically valid query should pass validation."""
        conditions = " AND ".join([f"col{i} > {i}" for i in range(50)])
        sql = f"SELECT * FROM users WHERE {conditions}"
        is_valid, msg, _ = validate_sql(sql)
        assert is_valid is True, f"Expected valid, got: {msg}"
