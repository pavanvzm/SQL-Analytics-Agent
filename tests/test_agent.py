"""Tests for src/agent.py — the self-healing SQL generation loop."""

import os
import tempfile

import duckdb
from unittest.mock import patch

import pytest

from src.agent import SQLAnalyticsAgent, SQLSkill, SchemaSkill


class TestSQLSkill:
    """Verify SQL extraction from LLM responses."""

    def test_extract_sql_from_fence(self):
        text = "Here is your query:\n```sql\nSELECT * FROM users\n```\nEnjoy!"
        sql = SQLSkill._extract_sql(text)
        assert sql == "SELECT * FROM users"

    def test_extract_sql_from_fence_case_insensitive(self):
        text = "```SQL\nSELECT * FROM orders\n```"
        sql = SQLSkill._extract_sql(text)
        assert sql == "SELECT * FROM orders"

    def test_extract_sql_fallback_select(self):
        text = "The result is SELECT name, age FROM users; And that's it."
        sql = SQLSkill._extract_sql(text)
        assert "SELECT" in sql.upper()

    def test_extract_sql_no_sql(self):
        text = "I don't know how to do that."
        sql = SQLSkill._extract_sql(text)
        assert sql == text

    def test_extract_sql_multiline_fence(self):
        text = "```sql\nSELECT u.name,\n       o.amount\nFROM users u\nJOIN orders o ON u.id = o.user_id\n```"
        sql = SQLSkill._extract_sql(text)
        assert "SELECT" in sql
        assert "JOIN" in sql


class TestSchemaSkill:
    """Verify the SchemaSkill correctly wraps schema discovery."""

    def test_fetch(self, sample_db_path):
        schema = SchemaSkill.fetch(sample_db_path)
        assert "tables" in schema
        assert "users" in schema["tables"]

    def test_format(self, sample_db_path):
        schema = SchemaSkill.fetch(sample_db_path)
        text = SchemaSkill.format(schema)
        assert "users" in text
        assert "orders" in text


class TestSQLAnalyticsAgent:
    """Integration tests for the full agent pipeline (with mocked LLM)."""

    def test_agent_initialization(self, sample_db_path):
        agent = SQLAnalyticsAgent(
            db_path=sample_db_path,
            openai_api_key="sk-test-key",
            model="gpt-4o-mini",
            max_retries=1,
            query_timeout=10,
            max_rows=100,
        )
        assert agent.db_path == sample_db_path
        assert agent.max_retries == 1
        assert agent.query_timeout == 10
        assert agent.max_rows == 100

    @patch("src.agent.ChatOpenAI")
    def test_ask_returns_dict(self, mock_chat, sample_db_path):
        """Even with a mocked LLM, ask() returns the correct result structure."""
        mock_llm_instance = mock_chat.return_value
        mock_llm_instance.invoke.return_value.content = "```sql\nSELECT * FROM users\n```"

        agent = SQLAnalyticsAgent(
            db_path=sample_db_path,
            openai_api_key="sk-test",
        )
        agent._llm = mock_llm_instance  # inject mock

        result = agent.ask("Show all users")
        assert "question" in result
        assert "sql" in result
        assert "data" in result
        assert "success" in result
        assert "error_log" in result
        assert "retries" in result
        assert result["question"] == "Show all users"

    @patch("src.agent.ChatOpenAI")
    def test_ask_success_path(self, mock_chat, sample_db_path):
        """With valid SQL returned from LLM, the agent should execute successfully."""
        mock_llm_instance = mock_chat.return_value
        mock_llm_instance.invoke.return_value.content = "```sql\nSELECT * FROM users\n```"

        agent = SQLAnalyticsAgent(db_path=sample_db_path, openai_api_key="sk-test")
        agent._llm = mock_llm_instance

        result = agent.ask("Show all users")
        assert result["success"] is True
        assert result["data"] is not None
        assert len(result["data"]) == 4
        assert result["sql"] is not None
        assert result["retries"] == 0

    @patch("src.agent.ChatOpenAI")
    def test_ask_with_correction(self, mock_chat, sample_db_path):
        """The agent should retry when the initial SQL is invalid."""
        mock_llm_instance = mock_chat.return_value
        # First call returns bad SQL, second returns good SQL
        mock_llm_instance.invoke.side_effect = [
            type("Resp", (), {"content": "```sql\nSELECTT * FROM users\n```"})(),  # syntax error
            type("Resp", (), {"content": "```sql\nSELECT * FROM users\n```"})(),  # good
        ]

        agent = SQLAnalyticsAgent(db_path=sample_db_path, openai_api_key="sk-test", max_retries=2)
        agent._llm = mock_llm_instance

        result = agent.ask("Show all users")
        assert result["success"] is True
        assert result["retries"] == 1
        assert len(result["error_log"]) >= 1
        assert "Syntax error" in result["error_log"][0]

    @patch("src.agent.ChatOpenAI")
    def test_ask_max_retries_exhausted(self, mock_chat, sample_db_path):
        """When the LLM keeps returning invalid SQL, retries are exhausted."""
        mock_llm_instance = mock_chat.return_value
        mock_llm_instance.invoke.return_value = type(
            "Resp", (), {"content": "```sql\nSELECTT * FROM users\n```"}
        )()

        agent = SQLAnalyticsAgent(db_path=sample_db_path, openai_api_key="sk-test", max_retries=2)
        agent._llm = mock_llm_instance

        result = agent.ask("Show all users")
        assert result["success"] is False
        assert result["retries"] == 2  # exhausted all retries
        assert len(result["error_log"]) == 3  # initial + 2 retries

    @patch("src.agent.ChatOpenAI")
    def test_ask_empty_database(self, mock_chat):
        """If the database has no tables, the agent should report it."""
        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        os.unlink(db_path)  # remove empty file so DuckDB creates it fresh
        conn = duckdb.connect(db_path)
        conn.close()

        agent = SQLAnalyticsAgent(db_path=db_path, openai_api_key="sk-test")
        agent._llm = mock_chat.return_value

        result = agent.ask("Show me something")
        assert result["success"] is False
        assert any("No tables" in err for err in result["error_log"])

        # Cleanup
        try:
            os.unlink(db_path)
            wal = db_path + ".wal"
            if os.path.exists(wal):
                os.unlink(wal)
        except OSError:
            pass

    @patch("src.agent.ChatOpenAI")
    def test_ask_nonexistent_database(self, mock_chat):
        """If the database file doesn't exist, the agent should report an error."""
        agent = SQLAnalyticsAgent(db_path="/nonexistent/path.db", openai_api_key="sk-test")
        agent._llm = mock_chat.return_value

        result = agent.ask("Show me data")
        assert result["success"] is False
        assert len(result["error_log"]) > 0
