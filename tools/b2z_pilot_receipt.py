"""Compare an actual public receipt row with an independently authenticated receipt."""
def number(v):
    return int(v["$integer"]) if isinstance(v, dict) else int(v)

def receipt_row_matches(columns, reason, kind, receipt):
    if len(columns) != 4 or columns[0] != str(number(receipt["position"])) or columns[1] != receipt["account"]:
        return False
    if reason != receipt["reason"] or kind != receipt.get("kind", ""):
        return False
    if receipt.get("status") not in ("applied", "partially_applied"):
        return False
    text = columns[2]
    if "actual_quantity" in receipt:
        expected = receipt["status"].replace("_", " ")
        return text.startswith(expected + " · ") and f'{receipt["actual_quantity"]}/{receipt["requested_quantity"]} balls' in text
    return receipt["reason"] == "ACCEPTED" and text == "Accepted"
