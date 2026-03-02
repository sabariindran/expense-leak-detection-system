from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
import pandas as pd
from datetime import datetime
from analytics import analyze_transactions
from categorize import categorize_merchant
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo (allow React frontend)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# DATABASE INIT
# ==============================

def init_db():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "database.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_name TEXT,
        amount REAL,
        timestamp TEXT,
        payment_method TEXT,
        category TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

# ==============================
# PAYMENT MODEL
# ==============================

class Payment(BaseModel):
    merchant_name: str
    amount: float
    payment_method: str
    upi_id: str | None = None



# ==============================
# ADD PAYMENT
# ==============================

@app.post("/pay")
def add_payment(payment: Payment):
    category = categorize_merchant(payment.merchant_name)

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO transactions (merchant_name, amount, timestamp, payment_method, category)
    VALUES (?, ?, ?, ?, ?)
    """, (
        payment.merchant_name,
        abs(payment.amount),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        payment.payment_method,
        category
    ))

    conn.commit()
    conn.close()

    import random

    transaction_id = "TXN" + str(random.randint(100000, 999999))

    return {
        "status": "success",
        "transaction_id": transaction_id
        }


# ==============================
# GET ALL TRANSACTIONS
# ==============================

@app.get("/transactions")
def get_transactions():
    conn = sqlite3.connect("database.db")
    df = pd.read_sql_query("SELECT * FROM transactions", conn)
    conn.close()

    if df.empty:
        return []

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    result = []
    for _, row in df.iterrows():
        result.append({
            "id": row["id"],
            "merchant": row["merchant_name"],
            "amount": row["amount"],
            "date": row["timestamp"].strftime("%Y-%m-%d"),
            "category": row["category"].capitalize(),
            "payment_method": row["payment_method"]
        })

    return result


# ==============================
# DASHBOARD ANALYTICS
# ==============================

@app.get("/dashboard")
def get_dashboard():
    conn = sqlite3.connect("database.db")
    df = pd.read_sql_query("SELECT * FROM transactions", conn)
    conn.close()

    if df.empty:
        return {
            "total_spent": 0,
            "alerts": [],
            "habit_score": 100,
            "active_alerts": 0,
            "spending_by_merchant": [],
            "monthly_trend": []
        }

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # 🔥 CORE AI ANALYSIS
    analysis = analyze_transactions(df)

    # ===== Merchant Chart =====
    merchant_chart = (
        df.groupby("merchant_name")["amount"]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )

    spending_by_merchant = [
        {"merchant": row["merchant_name"], "amount": float(row["amount"])}
        for _, row in merchant_chart.iterrows()
    ]

    # ===== Monthly Trend =====
    df["month"] = df["timestamp"].dt.to_period("M").astype(str)

    monthly_chart = (
        df.groupby("month")["amount"]
        .sum()
        .reset_index()
    )

    monthly_trend = [
        {"month": row["month"], "amount": float(row["amount"])}
        for _, row in monthly_chart.iterrows()
    ]

    return {
        "total_spent": analysis["total_spent"],
        "alerts": analysis["alerts"],
        "habit_score": analysis["habit_score"],
        "active_alerts": len(analysis["alerts"]),
        "spending_by_merchant": spending_by_merchant,
        "monthly_trend": monthly_trend
    }
