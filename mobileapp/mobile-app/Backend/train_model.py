import pandas as pd
import pickle
from categorize import categorize_merchant


def train_behavior_model(csv_path="D:\\expense-leak-detection-system\\data\\raw_transaction.csv"):
    # Load dataset
    df = pd.read_csv(csv_path)

    # Keep only successful transactions
    df["status"] = df["status"].astype(str).str.lower()
    df = df[df["status"] == "success"]

    # Clean date & amount
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["amount"] = df["amount"].abs()


    df = df.dropna(subset=["date", "amount", "name"])

    # Rename for consistency
    df.rename(columns={
        "name": "merchant_name",
        "date": "timestamp"
    }, inplace=True)

    # Categorize merchants
    df["category"] = df["merchant_name"].apply(categorize_merchant)

    # Extract month
    df["month"] = df["timestamp"].dt.to_period("M")

    # Merchant-level behavioral profile
    merchant_stats = df.groupby("merchant_name").agg(
        total_spent=("amount", "sum"),
        frequency=("amount", "count"),
        avg_amount=("amount", "mean"),
        std_amount=("amount", "std")
    ).reset_index()

    # Category-level profile
    category_stats = df.groupby("category").agg(
        total_spent=("amount", "sum"),
        frequency=("amount", "count")
    ).reset_index()

    # Monthly spending trend
    monthly_stats = df.groupby("month").agg(
        total_spent=("amount", "sum")
    ).reset_index()

    # Save baseline model
    model = {
        "merchant_stats": merchant_stats,
        "category_stats": category_stats,
        "monthly_stats": monthly_stats
    }

    with open("model.pkl", "wb") as f:
        pickle.dump(model, f)

    print("✅ Behavioral baseline trained successfully.")
    print(f"Merchants analyzed: {len(merchant_stats)}")
    print(f"Categories detected: {len(category_stats)}")


if __name__ == "__main__":
    train_behavior_model()
