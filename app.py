"""Streamlit UI — SQL Analytics Agent with Dynamic Query Validation."""

import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

from src.agent import SQLAnalyticsAgent
from src.schema import discover_schema, format_schema_for_llm
from src.viz import generate_chart
from src.summary import generate_summary

load_dotenv()

# ── Page config ────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="SQL Analytics Agent",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Constants ──────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_DB_PATH = os.getenv("DB_PATH", "data.db")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
QUERY_TIMEOUT = int(os.getenv("QUERY_TIMEOUT", "10"))
MAX_ROWS = int(os.getenv("MAX_ROWS", "1000"))

# ── Session state ──────────────────────────────────────────────────────────

if "messages" not in st.session_state:
    st.session_state.messages = []
if "agent" not in st.session_state:
    st.session_state.agent = None
if "db_path" not in st.session_state:
    st.session_state.db_path = DEFAULT_DB_PATH
if "schema_text" not in st.session_state:
    st.session_state.schema_text = ""
if "show_sql" not in st.session_state:
    st.session_state.show_sql = True

# ── Sidebar ────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## ⚙️ Configuration")

    api_key = st.text_input(
        "OpenAI API Key",
        type="password",
        value=OPENAI_API_KEY,
        help="Set your OpenAI API key. You can also set the OPENAI_API_KEY env var.",
    )

    col1, col2 = st.columns(2)
    with col1:
        model = st.selectbox(
            "Model",
            options=["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
            index=0,
        )
    with col2:
        db_path_input = st.text_input(
            "Database Path",
            value=st.session_state.db_path,
            help="Path to a DuckDB database file (.db or .duckdb).",
        )

    # Update DB path
    if db_path_input != st.session_state.db_path:
        st.session_state.db_path = db_path_input
        st.session_state.schema_text = ""
        st.session_state.agent = None
        st.rerun()

    # Connect / Initialize agent
    if st.button("🔌 Connect to Database", type="primary", use_container_width=True):
        if not api_key:
            st.error("Please provide an OpenAI API key.")
        elif not Path(st.session_state.db_path).exists():
            st.error(f"Database file not found: {st.session_state.db_path}")
        else:
            with st.spinner("Discovering schema …"):
                try:
                    schema = discover_schema(st.session_state.db_path)
                    st.session_state.schema_text = format_schema_for_llm(schema)
                    st.session_state.agent = SQLAnalyticsAgent(
                        db_path=st.session_state.db_path,
                        openai_api_key=api_key,
                        model=model,
                        max_retries=MAX_RETRIES,
                        query_timeout=QUERY_TIMEOUT,
                        max_rows=MAX_ROWS,
                    )
                    st.success(f"Connected! Found {len(schema['tables'])} table(s).")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Connection failed: {exc}")

    st.divider()

    # Schema display
    if st.session_state.schema_text:
        st.markdown("## 📋 Database Schema")
        with st.expander("View Schema", expanded=False):
            st.text(st.session_state.schema_text)

        # Clear chat button
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.rerun()

    st.divider()
    st.caption(
        "Built with Streamlit · LangChain · SQLGlot · DuckDB · Plotly"
    )

# ── Main chat area ─────────────────────────────────────────────────────────

st.title("📊 SQL Analytics Agent")
st.markdown(
    "Ask questions about your data in plain English. "
    "The agent generates SQL, validates it, executes it safely, and visualizes the results."
)

# Welcome message if no messages
if not st.session_state.messages:
    st.info(
        "👋 **Welcome!** Start by configuring your database and API key in the sidebar, "
        "then click **Connect to Database**. After that, type a question below."
    )

# Chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

        if "result" in msg and msg["result"] is not None:
            result = msg["result"]

            with st.container(border=True):
                # SQL toggle
                if result.get("sql"):
                    show = st.checkbox(
                        "🐚 Show SQL",
                        value=st.session_state.show_sql,
                        key=f"show_sql_{id(msg)}",
                    )
                    if show:
                        st.code(result["sql"], language="sql")

                # Data
                df = result.get("data")
                if df is not None and not df.empty:
                    tab1, tab2, tab3 = st.tabs(["📈 Chart", "📋 Table", "📝 Summary"])

                    with tab1:
                        fig, chart_type = generate_chart(df, result.get("sql", ""))
                        st.plotly_chart(fig, use_container_width=True)

                    with tab2:
                        st.dataframe(df, use_container_width=True, hide_index=True)

                    with tab3:
                        # Generate summary
                        llm_callable = (
                            st.session_state.agent._llm.invoke
                            if st.session_state.agent
                            else None
                        )
                        summary = generate_summary(
                            df,
                            result.get("sql", ""),
                            result.get("question", ""),
                            llm=llm_callable,
                        )
                        st.markdown(summary)

                elif result.get("error_log"):
                    with st.expander("⚠️ Error Log"):
                        for err in result["error_log"]:
                            st.markdown(f"- {err}")

# Chat input
if prompt := st.chat_input("Ask a question about your data…"):
    # Validate setup
    if st.session_state.agent is None:
        st.error("Please connect to a database first using the sidebar.")
        st.stop()

    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Process
    with st.chat_message("assistant"):
        with st.spinner("Thinking … generating SQL … validating … executing …"):
            result = st.session_state.agent.ask(prompt)

        if result["success"]:
            st.success("✅ Query executed successfully.")
        else:
            st.warning("⚠️ Query completed with issues.")

        # Display result
        with st.container(border=True):
            # SQL toggle
            if result.get("sql"):
                show = st.checkbox(
                    "🐚 Show SQL",
                    value=st.session_state.show_sql,
                    key=f"show_sql_{id(result)}",
                )
                if show:
                    st.code(result["sql"], language="sql")

            # Data
            df = result.get("data")
            if df is not None and not df.empty:
                tab1, tab2, tab3 = st.tabs(["📈 Chart", "📋 Table", "📝 Summary"])

                with tab1:
                    fig, chart_type = generate_chart(df, result.get("sql", ""))
                    st.plotly_chart(fig, use_container_width=True)

                with tab2:
                    st.dataframe(df, use_container_width=True, hide_index=True)

                with tab3:
                    llm_callable = (
                        st.session_state.agent._llm.invoke
                        if st.session_state.agent
                        else None
                    )
                    summary = generate_summary(
                        df,
                        result.get("sql", ""),
                        result.get("question", ""),
                        llm=llm_callable,
                    )
                    st.markdown(summary)

            elif result.get("error_log"):
                with st.expander("⚠️ Error Log"):
                    for err in result["error_log"]:
                        st.markdown(f"- {err}")

    # Save to history
    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": "✅ Query executed." if result["success"] else "⚠️ Query had issues.",
            "result": result,
        }
    )

    st.rerun()
