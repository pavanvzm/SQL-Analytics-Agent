"""Tests for src/summary.py — plain-English insight generation."""

from src.summary import generate_summary


class TestGenerateSummary:
    """Verify summary text is produced correctly for various inputs."""

    def test_empty_dataframe(self, sample_df_empty):
        summary = generate_summary(
            sample_df_empty,
            sql="SELECT * FROM logs",
            question="Show me all logs",
        )
        assert "no results" in summary.lower()

    def test_basic_row_and_column_count(self, sample_df):
        summary = generate_summary(
            sample_df,
            sql="SELECT * FROM data",
            question="Show me the data",
        )
        assert "3 row" in summary
        assert "3 column" in summary

    def test_numeric_summary_included(self, sample_df):
        summary = generate_summary(
            sample_df,
            sql="SELECT product, total_amount, order_count FROM summary",
            question="Show product totals",
        )
        # Should mention total_amount stats
        assert "total" in summary.lower() or "average" in summary.lower() or "total_amount" in summary

    def test_single_row(self, sample_df_single_row):
        summary = generate_summary(
            sample_df_single_row,
            sql="SELECT * FROM categories",
            question="Show categories",
        )
        assert "1 row" in summary

    def test_llm_enrichment(self, sample_df, fake_llm_summary):
        """When an LLM callable is provided, its insight should appear in the summary."""
        summary = generate_summary(
            sample_df,
            sql="SELECT product, total_amount FROM summary",
            question="What are the product totals?",
            llm=fake_llm_summary,  # FakeLLM.__call__ returns the response string
        )
        assert "total sales" in summary.lower()

    def test_llm_failure_fallback(self, sample_df):
        """When the LLM callable raises an exception, fall back to template."""

        def broken_llm(_prompt: str) -> str:
            raise RuntimeError("API error")

        summary = generate_summary(
            sample_df,
            sql="SELECT * FROM data",
            question="Show data",
            llm=broken_llm,
        )
        assert "row" in summary  # fallback works

    def test_different_numeric_columns(self):
        import pandas as pd

        df = pd.DataFrame({
            "city": ["NYC", "LA", "CHI"],
            "population": [8_400_000, 3_800_000, 2_700_000],
            "area_sq_mi": [302.6, 468.7, 234.0],
        })
        summary = generate_summary(
            df,
            sql="SELECT city, population, area_sq_mi FROM cities",
            question="Show city data",
        )
        # Should mention the first numeric column (population)
        assert "population" in summary

    def test_query_without_numeric_columns(self):
        import pandas as pd

        df = pd.DataFrame({
            "name": ["Alice", "Bob"],
            "email": ["a@x.com", "b@x.com"],
        })
        summary = generate_summary(
            df,
            sql="SELECT name, email FROM users",
            question="List users",
        )
        assert "2 row" in summary
        assert summary is not None
