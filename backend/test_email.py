import asyncio
import sys
sys.path.insert(0, ".")
from app.agent.tools.email_tool import send_email

try:
    result = send_email("sa8385123@gmail.com", "Test Email", "This is a test email from the travel planner agent.")
    print(result)
except Exception as e:
    print("ERROR:", e)
