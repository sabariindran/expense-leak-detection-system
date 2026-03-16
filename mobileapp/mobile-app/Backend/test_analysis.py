import pandas as pd
from analytics import analyze_transactions

df = pd.read_csv("D:\\expense-leak-detection-system\\data\\raw_transaction.csv")
df.rename(columns={"name": "merchant_name", "date": "timestamp"}, inplace=True)

result = analyze_transactions(df)

print(result)
