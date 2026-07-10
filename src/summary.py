"""Summary — generates plain-English insights from query results."""

from typing import Optional

import pandas as pd


def generate_summary(
    df: pd.DataFrame,
    sql: str,
    question: str,
    llm: Optional[callable] = None,
) -> str:
    """Produce a plain-English summary of the query result.

    When an ``llm`` callable is provided (signature: ``str -> str``), it's used
    to generate a richer insight. Otherwise a template-based summary is built.

    Args:
        df: The result DataFrame.
        sql: The SQL that was executed.
        question: The original natural-language question.
        llm: Optional callable that takes a prompt and returns a string.

    Returns:
        A plain-English summary string.
    """
    if df.empty:
        return "The query returned no results."

    rows, cols = df.shape
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()

    # Build a basic summary
    summary_parts = [
        f"The query returned **{rows} row{'s' if rows != 1 else ''}** "
        f"across **{cols} column{'s' if cols != 1 else ''}**."
    ]

    if numeric_cols:
        # Add a highlight for the first numeric column
        first_num = numeric_cols[0]
        total = df[first_num].sum()
        mean = df[first_num].mean()
        summary_parts.append(
            f"Column **{first_num}** has a total of **{total:,.2f}** "
            f"(average **{mean:,.2f}**)."
        )

    if llm is not None:
        # Ask the LLM for a richer insight
        df_head = df.head(10).to_string()
        llm_prompt = (
            f"You are a data analyst. The user asked: \"{question}\"\n\n"
            f"The SQL executed was:\n```sql\n{sql}\n```\n\n"
            f"Here are the first {min(10, rows)} rows of the result:\n"
            f"```\n{df_head}\n```\n\n"
            f"Write a 1-2 sentence plain-English insight that highlights the "
            f"key takeaway from this data. Be concise and specific."
        )
        try:
            llm_insight = llm(llm_prompt).strip()
            if llm_insight:
                summary_parts.append("\n" + llm_insight)
        except Exception:
            pass  # fall back to template summary

    return "\n\n".join(summary_parts)
