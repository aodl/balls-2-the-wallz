#!/usr/bin/env python3
"""Independent stdlib implementation of the fixed CMC self-top-up address.

The production route uses ic-ledger-types. This check deliberately does not.
Convention: https://github.com/dfinity/ic/blob/master/rs/nns/cmc/src/lib.rs
"""
import base64
import binascii
import hashlib
import json

BACKEND = 's34gv-3qaaa-aaaar-qcifa-cai'
CMC = 'rkp4c-7iaaa-aaaaa-aaaca-cai'
EXPECTED = 'fa4c0ec911194217d5d4f3ec27f7ac26a7f19e74fbeeba39d469e4f24071b8de'


def principal(text):
    encoded = text.replace('-', '').upper()
    raw = base64.b32decode(encoded + '=' * (-len(encoded) % 8))
    assert binascii.crc32(raw[4:]).to_bytes(4, 'big') == raw[:4]
    return raw[4:]


def route():
    backend = principal(BACKEND)
    subaccount = bytes([len(backend)]) + backend + bytes(31 - len(backend))
    digest = hashlib.sha224(b'\x0aaccount-id' + principal(CMC) + subaccount).digest()
    account = binascii.crc32(digest).to_bytes(4, 'big') + digest
    assert account.hex() == EXPECTED
    return dict(beneficiary=BACKEND, cmc=CMC, subaccount_hex=subaccount.hex(),
                cmc_account_identifier=account.hex(), top_up_memo=1347768404)


if __name__ == '__main__':
    print(json.dumps(route(), indent=2))
