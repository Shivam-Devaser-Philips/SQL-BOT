from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from .config import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="User")  # Admin or User

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    prompt = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    execution_status = Column(String, nullable=False)  # SUCCESS, REJECTED, FAILED
    rows_returned = Column(Integer, default=0)
    confidence = Column(Float, default=0.0)

class QueryHistoryModel(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=True)
    prompt = Column(Text, nullable=False)
    sql = Column(Text, nullable=False)
    query_type = Column(String, nullable=False)  # SELECT, DDL, DML
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class SchemaMetadataModel(Base):
    __tablename__ = "schema_metadata"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    file_type = Column(String, nullable=False)  # DDL or JSON
    raw_content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
