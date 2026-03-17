import easyocr
import cv2
import re

reader = easyocr.Reader(['en'])

# ---------- IMAGE PREPROCESS ----------
def preprocess_image(path):

    img = cv2.imread(path)

    # enlarge image (helps small text)
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # increase contrast
    gray = cv2.equalizeHist(gray)

    # binary threshold
    _, thresh = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)

    return thresh


# ---------- TOTAL DETECTION ----------
def extract_total(text_list):

    text = " ".join(text_list).lower()

    # strong keyword detection
    patterns = [
        r'net[^0-9]*([0-9]+\.[0-9]+)',
        r'total[^0-9]*([0-9]+\.[0-9]+)',
        r'amount[^0-9]*([0-9]+\.[0-9]+)',
        r'payable[^0-9]*([0-9]+\.[0-9]+)'
    ]

    for p in patterns:
        match = re.search(p, text)
        if match:
            return float(match.group(1))

    # fallback: choose realistic amount range
    nums = re.findall(r'[0-9]+\.[0-9]+', text)

    nums = [float(n) for n in nums if 1 <= float(n) <= 50000]

    if nums:
        return max(nums)

    return 0


# ---------- MERCHANT DETECTION ----------
def extract_merchant(text_list):

    keywords = ["agency", "store", "mart", "cafe", "hotel",
                "restaurant", "petrol", "fuel", "gas", "indian"]

    for line in text_list[:20]:

        clean = re.sub(r'[^a-zA-Z ]', '', line).lower()

        for key in keywords:
            if key in clean:
                return clean.title()

    # fallback
    for line in text_list[:10]:
        clean = re.sub(r'[^a-zA-Z ]', '', line)
        if len(clean) > 6:
            return clean.title()

    return "Unknown"

def filter_items(text_list):

    items = []

    for line in text_list:

        clean = re.sub(r'[^a-zA-Z0-9 ]', '', line)

        # skip long address / phone
        if len(clean) > 40:
            continue

        # skip pure numbers
        if clean.isdigit():
            continue

        # skip very small noise
        if len(clean) < 3:
            continue

        items.append(clean)

    return items[:5]   # show only top 5

# ---------- MAIN OCR FUNCTION ----------
def process_bill(image_path):

    img = preprocess_image(image_path)

    result = reader.readtext(img, detail=0)

    print("OCR RAW RESULT:", result)   # ⭐ debug

    merchant = extract_merchant(result)
    amount = extract_total(result)

    print("MERCHANT:", merchant)
    print("AMOUNT:", amount)

    items = filter_items(result)
    print("FILTERED ITEMS:", items)

    return {
        "merchant": merchant,
        "total_amount": amount,
        "items": items
    }