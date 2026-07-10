"""Viz — auto-selects and generates Plotly charts from a DataFrame."""

from typing import Any, Optional

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def _detect_chart_type(df: pd.DataFrame) -> str:
    """Choose a chart type based on the DataFrame's shape and dtypes."""
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()

    if len(numeric_cols) == 0:
        return "table"

    # Pie: 1 categorical + 1 numeric, and <= 10 rows
    if len(cat_cols) >= 1 and len(numeric_cols) >= 1 and len(df) <= 10:
        return "pie"

    # Line: first column is datetime / date-ish
    first_col = df.columns[0]
    if pd.api.types.is_datetime64_any_dtype(df[first_col]):
        return "line"

    first_col_str = str(first_col).lower()
    if any(ts_kw in first_col_str for ts_kw in ("date", "time", "year", "month", "day")):
        return "line"

    # Bar: 1 categorical + numeric(s)
    if len(cat_cols) >= 1 and len(numeric_cols) >= 1:
        return "bar"

    # Scatter: 2+ numeric columns
    if len(numeric_cols) >= 2:
        return "scatter"

    # Fallback
    return "bar"


def generate_chart(
    df: pd.DataFrame,
    sql: str = "",
) -> tuple[go.Figure, str]:
    """Auto-generate a Plotly figure from a DataFrame.

    Args:
        df: The result DataFrame.
        sql: The SQL query (used for the chart title).

    Returns:
        A tuple of ``(figure, chart_type)``.
    """
    if df.empty:
        fig = go.Figure()
        fig.add_annotation(text="No data to chart", showarrow=False)
        fig.update_layout(title="Empty Result")
        return fig, "empty"

    chart_type = _detect_chart_type(df)
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category", "string"]).columns.tolist()

    title = sql[:80] + "…" if len(sql) > 80 else sql

    try:
        if chart_type == "pie" and cat_cols and numeric_cols:
            fig = px.pie(df, names=cat_cols[0], values=numeric_cols[0], title=title)
        elif chart_type == "line":
            x_col = df.columns[0]
            y_cols = numeric_cols[: min(5, len(numeric_cols))]
            fig = px.line(df, x=x_col, y=y_cols, title=title, markers=True)
        elif chart_type == "scatter" and len(numeric_cols) >= 2:
            fig = px.scatter(
                df,
                x=numeric_cols[0],
                y=numeric_cols[1],
                title=title,
                color=numeric_cols[2] if len(numeric_cols) > 2 else None,
            )
        else:
            # Default: bar chart
            x_col = cat_cols[0] if cat_cols else df.columns[0]
            y_cols = numeric_cols[: min(5, len(numeric_cols))] or [df.columns[0]]
            fig = px.bar(df, x=x_col, y=y_cols, title=title, barmode="group")
    except Exception:
        # Fallback to a simple table-like chart
        fig = go.Figure()
        fig.add_annotation(text="Could not generate chart", showarrow=False)
        fig.update_layout(title=title)

    fig.update_layout(
        template="plotly_white",
        hovermode="x unified",
        margin=dict(l=20, r=20, t=40, b=20),
    )
    return fig, chart_type
