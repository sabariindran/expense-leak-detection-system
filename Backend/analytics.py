import pandas as pd
import pickle
from datetime import datetime


# ===============================
# LOAD BASELINE MODEL
# ===============================

import os

def load_model():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(BASE_DIR, "model.pkl")

    with open(model_path, "rb") as f:
        return pickle.load(f)


# ===============================
# MICRO ACCUMULATION LEAK
# ===============================

def detect_micro_leaks(df):
    alerts = []

    merchant_stats = df.groupby("merchant_name").agg(
        total_spent=("amount", "sum"),
        frequency=("amount", "count"),
        avg_amount=("amount", "mean")
    ).reset_index()

    for _, row in merchant_stats.iterrows():
        if row["avg_amount"] < 100 and row["frequency"] >= 15 and row["total_spent"] >= 300:
            alerts.append({
                "type": "micro_spending",
                "merchant": row["merchant_name"],
                "total_spent": round(row["total_spent"], 2),
                "frequency": int(row["frequency"]),
                "message": f"You are repeatedly spending small amounts at {row['merchant_name']} which accumulates significantly."
            })

    return alerts


# ===============================
# MERCHANT CONCENTRATION LEAK
# ===============================

def detect_concentration_leak(df):
    alerts = []

    total_spent = df["amount"].sum()

    merchant_totals = df.groupby("merchant_name")["amount"].sum().reset_index()

    for _, row in merchant_totals.iterrows():
        percentage = (row["amount"] / total_spent) * 100
        if percentage >= 25:
            alerts.append({
                "type": "merchant_concentration",
                "merchant": row["merchant_name"],
                "percentage": round(percentage, 2),
                "message": f"{row['merchant_name']} accounts for {round(percentage,2)}% of your spending."
            })

    return alerts


# ===============================
# MONTHLY GROWTH LEAK
# ===============================

def detect_growth_pattern(df):
    alerts = []

    df["month"] = df["timestamp"].dt.to_period("M")

    monthly = df.groupby("month")["amount"].sum().reset_index()

    if len(monthly) >= 2:
        last = monthly.iloc[-1]["amount"]
        prev = monthly.iloc[-2]["amount"]

        if prev > 0:
            growth = ((last - prev) / prev) * 100
            if growth >= 20:
                alerts.append({
                    "type": "growth_pattern",
                    "growth_percentage": round(growth, 2),
                    "message": f"Your spending increased by {round(growth,2)}% compared to last month."
                })

    return alerts


# ===============================
# HABIT SCORE
# ===============================

def calculate_habit_score(df):
    score = 100

    total_spent = df["amount"].sum()
    merchant_counts = df["merchant_name"].value_counts()

    # Penalize heavy concentration
    if len(merchant_counts) > 0:
        top_ratio = merchant_counts.iloc[0] / len(df)
        score -= top_ratio * 30

    # Penalize too many micro transactions
    micro_count = df[df["amount"] < 100].shape[0]
    micro_ratio = micro_count / len(df)
    score -= micro_ratio * 20

    return max(40, round(score, 1))


# ===============================
# MAIN ANALYSIS FUNCTION
# ===============================

def analyze_transactions(df):
    model = load_model()

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()
    df = df.dropna()

    total_spent = df["amount"].sum()

    # Spending by merchant
    merchant_spend = (
        df.groupby("merchant_name")["amount"]
        .sum()
        .reset_index()
        .sort_values(by="amount", ascending=False)
    )

    spending_by_merchant = [
        {"merchant": row["merchant_name"], "amount": float(row["amount"])}
        for _, row in merchant_spend.iterrows()
    ]

    # Monthly trend
    df["month"] = df["timestamp"].dt.to_period("M").astype(str)
    monthly = (
        df.groupby("month")["amount"]
        .sum()
        .reset_index()
    )

    monthly_trend = [
        {"month": row["month"], "amount": float(row["amount"])}
        for _, row in monthly.iterrows()
    ]

    # Alerts
    micro_alerts = detect_micro_leaks(df)
    concentration_alerts = detect_concentration_leak(df)
    growth_alerts = detect_growth_pattern(df)

    alerts = micro_alerts + concentration_alerts + growth_alerts

    habit_score = calculate_habit_score(df)

    return {
        "total_spent": round(float(total_spent), 2),
        "habit_score": habit_score,
        "alerts": alerts,
        "active_alerts": len(alerts),
        "spending_by_merchant": spending_by_merchant,
        "monthly_trend": monthly_trend
    }
