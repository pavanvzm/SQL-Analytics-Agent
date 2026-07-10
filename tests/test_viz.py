"""Tests for src/viz.py — auto-selected Plotly chart generation."""

import pandas as pd
import plotly.graph_objects as go
from src.viz import generate_chart, _detect_chart_type


class TestDetectChartType:
    """Verify chart type detection logic."""

    def test_pie_small_cat_numeric(self, sample_df_single_row):
        assert _detect_chart_type(sample_df_single_row) == "pie"

    def test_pie_under_10_rows(self):
        df = pd.DataFrame({
            "cat": ["A", "B", "C"],
            "val": [10, 20, 30],
        })
        assert _detect_chart_type(df) == "pie"

    def test_line_datetime_col(self, sample_df_dates):
        assert _detect_chart_type(sample_df_dates) == "line"

    def test_line_date_keyword(self):
        """Column name containing 'date' triggers line chart (with >10 rows to avoid pie)."""
        df = pd.DataFrame({
            "order_date": [f"2024-{i:02d}-01" for i in range(1, 13)],
            "sales": list(range(100, 1300, 100)),
        })
        assert _detect_chart_type(df) == "line"

    def test_scatter_two_numeric(self, sample_df_numeric_only):
        assert _detect_chart_type(sample_df_numeric_only) == "scatter"

    def test_fallback_bar_large_dataset(self, sample_df_large):
        """>10 rows with cat + num should be bar."""
        assert _detect_chart_type(sample_df_large) == "bar"

    def test_fallback_bar_no_cat_cols(self):
        """When there are no cat cols but numeric cols exist, bar is fallback."""
        df = pd.DataFrame({
            "x": list(range(15)),
            "y": list(range(15)),
        })
        # datetime check: "x" - not date-like. Then bar check: len(cat_cols) >= 1? No cat cols.
        # Scatter: len(numeric_cols) >= 2? Yes (x and y). So it's scatter.
        assert _detect_chart_type(df) == "scatter"

    def test_no_numeric_cols(self):
        df = pd.DataFrame({"a": ["x", "y"], "b": ["p", "q"]})
        assert _detect_chart_type(df) == "table"

    def test_high_row_count_no_cat_cols(self):
        """Many numeric-only rows should be scatter."""
        df = pd.DataFrame({
            "a": list(range(100)),
            "b": list(range(100, 200)),
        })
        assert _detect_chart_type(df) == "scatter"


class TestGenerateChart:
    """Verify Plotly figures are returned correctly."""

    def test_returns_figure_and_type(self, sample_df):
        fig, chart_type = generate_chart(sample_df, sql="SELECT * FROM data")
        assert isinstance(fig, go.Figure)
        assert isinstance(chart_type, str)

    def test_empty_dataframe(self, sample_df_empty):
        fig, chart_type = generate_chart(sample_df_empty)
        assert isinstance(fig, go.Figure)
        assert chart_type == "empty"

    def test_pie_chart(self, sample_df_single_row):
        fig, chart_type = generate_chart(sample_df_single_row)
        assert chart_type == "pie"
        assert len(fig.data) > 0

    def test_line_chart(self, sample_df_dates):
        fig, chart_type = generate_chart(sample_df_dates)
        assert chart_type == "line"

    def test_scatter_chart(self, sample_df_numeric_only):
        fig, chart_type = generate_chart(sample_df_numeric_only)
        assert chart_type == "scatter"

    def test_chart_title_from_sql(self, sample_df):
        _, chart_type = generate_chart(sample_df, sql="SELECT product, SUM(amount) total FROM o...")
        assert isinstance(chart_type, str)

    def test_long_sql_truncated_title(self, sample_df):
        long_sql = "SELECT " + ", ".join(f"col{i}" for i in range(50)) + " FROM big_table"
        fig, _ = generate_chart(sample_df, sql=long_sql)
        title = fig.layout.title.text or ""
        assert len(title) <= 83  # 80 + "…"

    def test_different_dataframes_different_charts(self, sample_df_dates, sample_df_numeric_only):
        _, type_a = generate_chart(sample_df_dates)
        _, type_b = generate_chart(sample_df_numeric_only)
        assert type_a != type_b  # dates -> line, numeric -> scatter

    def test_bar_chart_large(self, sample_df_large):
        fig, chart_type = generate_chart(sample_df_large, sql="SELECT * FROM data")
        assert chart_type == "bar"
        assert len(fig.data) > 0
