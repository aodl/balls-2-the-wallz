import unittest
from b2z_pilot_receipt import receipt_row_matches

class ReceiptRows(unittest.TestCase):
    def test_move_accepted_is_not_purchase_applied(self):
        r={"position":{"$integer":"123"},"account":"fixture","kind":"cannon_moved","reason":"ACCEPTED","status":"applied"}
        row=["123","fixture","Accepted","Moved cannon"]
        self.assertTrue(receipt_row_matches(row,"ACCEPTED","cannon_moved",r))
        self.assertFalse(receipt_row_matches(["124",*row[1:]],"ACCEPTED","cannon_moved",r))
        self.assertFalse(receipt_row_matches(row,"WRONG_OWNER","cannon_moved",r))
        self.assertFalse(receipt_row_matches(row,"ACCEPTED","purchase_completed",r))
        self.assertFalse(receipt_row_matches(row,"ACCEPTED","cannon_moved",{**r,"status":"rejected"}))
    def test_purchase_keeps_quantity_and_status_assertions(self):
        r={"position":123,"account":"fixture","kind":"purchase_completed","reason":"ACCEPTED","status":"partially_applied","actual_quantity":1,"requested_quantity":2}
        row=["123","fixture","partially applied · 1/2 balls · used 0.1 ICP","purchase_completed"]
        self.assertTrue(receipt_row_matches(row,"ACCEPTED","purchase_completed",r))
        self.assertFalse(receipt_row_matches([*row[:2],"applied · 2/2 balls",row[3]],"ACCEPTED","purchase_completed",r))
        self.assertFalse(receipt_row_matches([row[0],"other",*row[2:]],"ACCEPTED","purchase_completed",r))

if __name__ == "__main__": unittest.main()
