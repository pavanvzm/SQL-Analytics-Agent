"""Shared fixtures for all tests."""

import os
import tempfile
from typing import Any

import duckdb
import pandas as pd
import pytest


@pytest.fixture(scope="session")
def sample_db_path() -> str:
    """Create a temporary DuckDB database with sample tables and seed data.

    The database is created once per test session and cleaned up at the end.
    """
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(db_path)  # remove empty file so DuckDB creates it fresh

    conn = duckdb.connect(db_path)

    # ── Users table ────────────────────────────────────────────────────
    conn.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name VARCHAR,
            email VARCHAR,
            age INTEGER,
            created_at DATE
        )
    """)
    conn.executemany(
        "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
        [
            (1, "Alice", "alice@example.com", 30, "2024-01-15"),
            (2, "Bob", "bob@example.com", 25, "2024-02-20"),
            (3, "Charlie", "charlie@example.com", 35, "2024-03-10"),
            (4, "Diana", "diana@example.com", 28, "2024-04-05"),
        ],
    )

    # ── Orders table ───────────────────────────────────────────────────
    conn.execute("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            product VARCHAR,
            amount REAL,
            quantity INTEGER,
            order_date DATE
        )
    """)
    conn.executemany(
        "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)",
        [
            (101, 1, "Widget", 19.99, 2, "2024-02-01"),
            (102, 1, "Gadget", 49.99, 1, "2024-03-15"),
            (103, 2, "Widget", 19.99, 3, "2024-04-01"),
            (104, 3, "Gadget", 49.99, 2, "2024-04-10"),
            (105, 3, "Doohickey", 9.99, 5, "2024-05-01"),
            (106, 4, "Widget", 19.99, 1, "2024-05-15"),
        ],
    )

    # ── Empty table (no rows) ──────────────────────────────────────────
    conn.execute("""
        CREATE TABLE logs (
            id INTEGER PRIMARY KEY,
            event VARCHAR,
            timestamp TIMESTAMP
        )
    """)

    conn.close()

    yield db_path

    # Cleanup after session
    try:
        if os.path.exists(db_path):
            os.unlink(db_path)
        wal = db_path + ".wal"
        if os.path.exists(wal):
            os.unlink(wal)
    except OSError:
        pass


@pytest.fixture
def sample_df() -> pd.DataFrame:
    """A small DataFrame for viz and summary tests."""
    return pd.DataFrame(
        {
            "product": ["Widget", "Gadget", "Doohickey"],
            "total_amount": [59.97, 149.97, 49.95],
            "order_count": [6, 3, 5],
        }
    )


@pytest.fixture
def sample_df_single_row() -> pd.DataFrame:
    """Single-row DataFrame (triggers pie chart in viz)."""
    return pd.DataFrame(
        {
            "category": ["Electronics"],
            "revenue": [1000.0],
        }
    )


@pytest.fixture
def sample_df_empty() -> pd.DataFrame:
    """Empty DataFrame."""
    return pd.DataFrame()


@pytest.fixture
def sample_df_dates() -> pd.DataFrame:
    """DataFrame with a date column (triggers line chart in viz)."""
    return pd.DataFrame(
        {
            "month": pd.to_datetime(["2024-01-01", "2024-02-01", "2024-03-01"]),
            "sales": [100, 150, 200],
            "costs": [80, 110, 130],
        }
    )


@pytest.fixture
def sample_df_numeric_only() -> pd.DataFrame:
    """Numeric-only DataFrame (triggers scatter chart in viz)."""
    return pd.DataFrame(
        {
            "x": [1.0, 2.0, 3.0, 4.0, 5.0],
            "y": [10.0, 20.0, 15.0, 25.0, 30.0],
        }
    )


@pytest.fixture
def sample_df_large() -> pd.DataFrame:
    """Larger DataFrame (>10 rows) for bar-chart tests."""
    return pd.DataFrame(
        {
            "category": [f"cat_{i}" for i in range(15)],
            "value": list(range(15)),
        }
    )


class FakeLLMResponse:
    """Holds a canned response string so callers get a string, not a MagicMock."""

    def __init__(self, content: str = ""):
        self.content = content


class FakeLLM:
    """A fake LangChain-compatible LLM returning a canned response."""

    def __init__(self, response: str = "```sql\nSELECT 1\n```"):
        self.response = response

    def invoke(self, messages: list) -> FakeLLMResponse:
        """Simulate ChatOpenAI.invoke() by returning a response-like object."""
        return FakeLLMResponse(content=self.response)

    def __call__(self, prompt: str) -> str:
        """Allow FakeLLM to be used as a plain callable (for summary)."""
        return self.response


@pytest.fixture
def fake_llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def fake_llm_summary() -> FakeLLM:
    return FakeLLM(response="Total sales were approximately $260 across all products.")
