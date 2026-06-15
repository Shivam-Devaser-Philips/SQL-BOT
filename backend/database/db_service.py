import os
import sqlite3
from sqlalchemy.orm import Session
from .config import engine, Base, SessionLocal
from .models import UserModel
from security.auth import get_password_hash

def init_db():
    # 1. Create all copilot system tables
    Base.metadata.create_all(bind=engine)

    # 2. Seed default admin and user
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(UserModel).filter(UserModel.username == "admin").first()
        if not admin:
            admin_user = UserModel(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="Admin"
            )
            db.add(admin_user)
            
        user = db.query(UserModel).filter(UserModel.username == "analyst").first()
        if not user:
            analyst_user = UserModel(
                username="analyst",
                hashed_password=get_password_hash("analyst123"),
                role="User"
            )
            db.add(analyst_user)
        db.commit()
    except Exception as e:
        print(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

    # 3. Seed sample banking database tables in the SQLite database to serve as the local execution target
    # We execute this directly on the engine's raw connection
    conn = engine.raw_connection()
    try:
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Create Branches Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS branches (
            branch_id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_name TEXT NOT NULL,
            location TEXT NOT NULL,
            loan_exposure REAL DEFAULT 0.0
        );
        """)
        
        # Create Customers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            branch_id INTEGER,
            FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        );
        """)
        
        # Create CASA Accounts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS casa_accounts (
            account_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            account_number TEXT UNIQUE NOT NULL,
            account_type TEXT CHECK(account_type IN ('SAVINGS', 'CURRENT')),
            balance REAL DEFAULT 0.0,
            status TEXT CHECK(status IN ('ACTIVE', 'INACTIVE')),
            opened_date DATE DEFAULT CURRENT_DATE,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        );
        """)
        
        # Create Loans Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS loans (
            loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            loan_amount REAL NOT NULL,
            interest_rate REAL NOT NULL,
            status TEXT CHECK(status IN ('ACTIVE', 'COMPLETED', 'DELINQUENT')),
            branch_id INTEGER,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
            FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        );
        """)

        # Check if tables are empty before seeding
        cursor.execute("SELECT COUNT(*) FROM branches;")
        if cursor.fetchone()[0] == 0:
            # Seed Branches
            branches = [
                ("Mumbai Central", "Mumbai", 12000000.0),
                ("Delhi Connaught", "Delhi", 9500000.0),
                ("Bangalore Whitefield", "Bangalore", 15000000.0),
                ("Chennai Adyar", "Chennai", 6000000.0)
            ]
            cursor.executemany("INSERT INTO branches (branch_name, location, loan_exposure) VALUES (?, ?, ?);", branches)
            
            # Seed Customers
            customers = [
                ("Aditya Sharma", "aditya@sharma.com", "+919876543210", 1),
                ("Priya Patel", "priya@patel.com", "+919876543211", 1),
                ("Rajesh Kumar", "rajesh@kumar.com", "+919876543212", 2),
                ("Sneha Reddy", "sneha@reddy.com", "+919876543213", 3),
                ("Vikram Singh", "vikram@singh.com", "+919876543214", 3),
                ("Ananya Rao", "ananya@rao.com", "+919876543215", 4),
                ("Rohan Gupta", "rohan@gupta.com", "+919876543216", 2),
                ("Kriti Verma", "kriti@verma.com", "+919876543217", 1),
                ("Amit Joshi", "amit@joshi.com", "+919876543218", 3),
                ("Deepa Nair", "deepa@nair.com", "+919876543219", 4)
            ]
            cursor.executemany("INSERT INTO customers (customer_name, email, phone, branch_id) VALUES (?, ?, ?, ?);", customers)
            
            # Seed CASA Accounts
            casa_accounts = [
                (1, "ACC1001", "SAVINGS", 450000.0, "ACTIVE", "2023-01-15"),
                (1, "ACC1002", "CURRENT", 1200000.0, "ACTIVE", "2023-06-20"),
                (2, "ACC1003", "SAVINGS", 85000.0, "ACTIVE", "2024-02-10"),
                (3, "ACC1004", "SAVINGS", 320000.0, "ACTIVE", "2022-11-05"),
                (4, "ACC1005", "CURRENT", 2500000.0, "ACTIVE", "2021-08-14"),
                (5, "ACC1006", "SAVINGS", 12000.0, "INACTIVE", "2020-03-22"),
                (6, "ACC1007", "SAVINGS", 750000.0, "ACTIVE", "2023-09-01"),
                (7, "ACC1008", "CURRENT", 150000.0, "ACTIVE", "2024-01-30"),
                (8, "ACC1009", "SAVINGS", 980000.0, "ACTIVE", "2022-04-12"),
                (9, "ACC1010", "SAVINGS", 5000.0, "INACTIVE", "2020-07-19"),
                (10, "ACC1011", "CURRENT", 620000.0, "ACTIVE", "2023-11-11")
            ]
            cursor.executemany("INSERT INTO casa_accounts (customer_id, account_number, account_type, balance, status, opened_date) VALUES (?, ?, ?, ?, ?, ?);", casa_accounts)
            
            # Seed Loans
            loans = [
                (1, 500000.0, 8.5, "ACTIVE", 1),
                (3, 1200000.0, 9.2, "ACTIVE", 2),
                (4, 3500000.0, 7.8, "ACTIVE", 3),
                (5, 150000.0, 12.0, "DELINQUENT", 3),
                (7, 800000.0, 8.9, "ACTIVE", 2),
                (8, 2200000.0, 8.2, "ACTIVE", 1),
                (10, 450000.0, 9.5, "COMPLETED", 4)
            ]
            cursor.executemany("INSERT INTO loans (customer_id, loan_amount, interest_rate, status, branch_id) VALUES (?, ?, ?, ?, ?);", loans)

        conn.commit()
    except Exception as e:
        print(f"Error seeding sample banking tables: {e}")
        conn.rollback()
    finally:
        conn.close()
