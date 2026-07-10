"""Tests for src/schema.py — DuckDB schema discovery and formatting."""

import pytest
from src.schema import discover_schema, format_schema_for_llm


class TestDiscoverSchema:
    """Verify schema discovery returns accurate table/column/relationship info."""

    def test_discovers_tables(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        tables = schema["tables"]
        assert "users" in tables
        assert "orders" in tables
        assert "logs" in tables

    def test_discovers_columns(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        users_cols = schema["columns"]["users"]
        col_names = [c[0] for c in users_cols]
        assert "id" in col_names
        assert "name" in col_names
        assert "email" in col_names
        assert "age" in col_names
        assert "created_at" in col_names

    def test_discovers_column_types(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        users_cols = schema["columns"]["users"]
        col_types = {c[0]: c[1] for c in users_cols}
        assert "INTEGER" in col_types["id"].upper() or "INT" in col_types["id"].upper()
        assert "DATE" in col_types["created_at"].upper()

    def test_row_counts(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        assert schema["row_counts"]["users"] == 4
        assert schema["row_counts"]["orders"] == 6
        assert schema["row_counts"]["logs"] == 0

    def test_inferred_relationships(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        rels = schema["relationships"]
        user_id_rels = [
            r
            for r in rels
            if r["from_table"] == "orders"
            and r["from_column"] == "user_id"
            and r["to_table"] == "users"
        ]
        assert len(user_id_rels) == 1
        assert user_id_rels[0]["to_column"] == "id"

    def test_no_relationships_for_tables_without_fk(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        # logs has no _id columns
        logs_rels = [r for r in schema["relationships"] if r["from_table"] == "logs"]
        assert len(logs_rels) == 0

    def test_caching(self, sample_db_path):
        schema_a = discover_schema(sample_db_path)
        schema_b = discover_schema(sample_db_path)
        assert schema_a is schema_b  # same cached object (lru_cache)


class TestFormatSchemaForLLM:
    """Verify the LLM-friendly schema string is readable and complete."""

    def test_contains_tables(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        text = format_schema_for_llm(schema)
        assert "users" in text
        assert "orders" in text
        assert "logs" in text

    def test_contains_column_info(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        text = format_schema_for_llm(schema)
        assert "name" in text
        assert "email" in text
        assert "amount" in text

    def test_contains_relationships(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        text = format_schema_for_llm(schema)
        assert "user_id" in text
        assert "users.id" in text
        assert "→" in text

    def test_contains_row_counts(self, sample_db_path):
        schema = discover_schema(sample_db_path)
        text = format_schema_for_llm(schema)
        assert "~4 rows" in text
        assert "~6 rows" in text

    def test_empty_schema(self):
        schema = {"tables": [], "columns": {}, "row_counts": {}, "relationships": []}
        text = format_schema_for_llm(schema)
        assert "Database Schema" in text
        assert "users" not in text
