import json
import os

GLOSSARY_DATA = {
    "CASA": {
        "term": "Current Account Savings Account",
        "definition": "A combination of current and savings accounts designed to help depositors keep their funds, offering high liquidity and flexibility.",
        "context_hint": "In SQL, this is typically represented by the `casa_accounts` table, filtering on `account_type` in ('SAVINGS', 'CURRENT')."
    },
    "NPA": {
        "term": "Non-Performing Assets",
        "definition": "A classification for loans or advances that are in default or in arrears on scheduled payments of interest or principal.",
        "context_hint": "In SQL, this is typically identified by selecting from the `loans` table where `status` is 'DELINQUENT'."
    },
    "BRANCH EXPOSURE": {
        "term": "Branch Loan Exposure",
        "definition": "The total financial commitment or outstanding loan balance associated with a specific branch location.",
        "context_hint": "In SQL, this is calculated by summing `loan_amount` grouped by `branch_id` from the `loans` table or referring to `branches.loan_exposure`."
    },
    "LOAN PORTFOLIO": {
        "term": "Loan Portfolio",
        "definition": "The total collection of loans held by the bank, which indicates the bank's lending profile and credit risk exposure.",
        "context_hint": "Usually queried from the `loans` table, grouping by status or branch."
    },
    "INACTIVE ACCOUNTS": {
        "term": "Inactive Accounts",
        "definition": "Accounts that have had no transactions or activity over a specified period.",
        "context_hint": "Represented in the `casa_accounts` table where `status` = 'INACTIVE'."
    },
    "ACTIVE ACCOUNTS": {
        "term": "Active Accounts",
        "definition": "Accounts that are currently active and in use for routine transactions.",
        "context_hint": "Represented in the `casa_accounts` table where `status` = 'ACTIVE'."
    }
}

class GlossaryEngine:
    def __init__(self):
        self.glossary = GLOSSARY_DATA

    def get_definitions(self) -> dict:
        return self.glossary

    def lookup(self, text: str) -> list:
        # Check if any glossary terms appear in the text
        found = []
        upper_text = text.upper()
        for term, info in self.glossary.items():
            if term in upper_text:
                found.append({
                    "term": term,
                    "full_name": info["term"],
                    "definition": info["definition"],
                    "hint": info["context_hint"]
                })
        return found
