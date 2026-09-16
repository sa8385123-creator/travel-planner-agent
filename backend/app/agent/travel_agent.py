import os

from pathlib import Path

from dotenv import load_dotenv

from datetime import date as date_class

from typing import Optional, List, Dict, Any


# Load .env from the backend directory relative to this file
dotenv_path = Path(__file__).resolve().parents[2] / ".env"

load_dotenv(dotenv_path=dotenv_path)


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable not set")


from openai import AsyncOpenAI

from agents import Agent, function_tool, Runner

from agents.models.openai_chatcompletions import OpenAIChatCompletionsModel


# Configure Groq client
groq_client = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)


model = OpenAIChatCompletionsModel(
    openai_client=groq_client,
    model="openai/gpt-oss-120b"
)


# Import tool functions
from .tools.weather_tool import get_weather
from .tools.flight_tool import search_flights
from .tools.hotel_tool import search_hotels
from .tools.memory_tools import save_preference, get_user_preferences
from .tools.email_tool import send_email


tool_call_log: List[Dict[str, Any]] = []

current_user_email: str = ""


# ============================================================
# WEATHER TOOL
# ============================================================

@function_tool
def get_weather_tool(
    city: str,
    date: Optional[str] = None
):
    """Get weather for a city.

    Args:
        city: Name of the city (e.g., "Paris").
        date: Date for which to get weather (default: today).
    """

    if date is None:
        date = date_class.today().isoformat()

    result = get_weather(city, date)

    tool_call_log.append({
        "tool": "weather",
        "data": result
    })

    return result


# ============================================================
# FLIGHT TOOL
# ============================================================

@function_tool
def search_flights_tool(
    origin: str,
    destination: str,
    date: str
):
    """Search for flight options.

    Args:
        origin: Origin city or airport code (e.g., "New York").
        destination: Destination city or airport code (e.g., "Paris").
        date: Travel date in YYYY-MM-DD format.
    """

    result = search_flights(
        origin,
        destination,
        date
    )

    tool_call_log.append({
        "tool": "flights",
        "data": result
    })

    return result


# ============================================================
# HOTEL TOOL
# ============================================================

@function_tool
def search_hotels_tool(
    city: str,
    check_in: str,
    check_out: str
):
    """Search for hotel options.

    Args:
        city: City where hotels are needed (e.g., "Paris").
        check_in: Check-in date in YYYY-MM-DD format.
        check_out: Check-out date in YYYY-MM-DD format.
    """

    result = search_hotels(
        city,
        check_in,
        check_out
    )

    tool_call_log.append({
        "tool": "hotels",
        "data": result
    })

    return result


# ============================================================
# SAVE PREFERENCE TOOL
# ============================================================

@function_tool
async def save_preference_tool(
    user_id: str,
    key: str,
    value: str
):
    """Save a long-term travel preference for the user.

    Stores preferences like seat preference, budget range,
    preferred airlines, etc.
    """

    print(
        f"[MEMORY] save_preference_tool called: "
        f"user_id={user_id}, key={key}, value={value}"
    )

    try:

        result = await save_preference(
            user_id=user_id,
            key=key,
            value=value
        )

        print(
            f"[MEMORY] save_preference result: {result}"
        )

        tool_call_log.append({
            "tool": "preferences",
            "data": result
        })

        return result

    except Exception as e:

        print(
            f"[MEMORY ERROR] "
            f"{type(e).__name__}: {e}"
        )

        return (
            f"Failed to save preference because of "
            f"an internal error: {type(e).__name__}: {e}"
        )


# ============================================================
# GET PREFERENCES TOOL
# ============================================================

@function_tool
async def get_preferences_tool(
    user_id: str
):
    """Retrieve all long-term travel preferences for the user.

    Returns a dictionary of preferences such as seat preference,
    budget range, preferred airlines.
    """

    print(
        f"[MEMORY] get_preferences_tool called: "
        f"user_id={user_id}"
    )

    try:

        prefs = await get_user_preferences(
            user_id=user_id
        )

        result = prefs or {}

        print(
            f"[MEMORY] preferences result: {result}"
        )

        tool_call_log.append({
            "tool": "preferences",
            "data": result
        })

        return result

    except Exception as e:

        print(
            f"[MEMORY ERROR] "
            f"{type(e).__name__}: {e}"
        )

        return (
            f"Failed to retrieve preferences because of "
            f"an internal error: {type(e).__name__}: {e}"
        )


# ============================================================
# EMAIL TOOL
# ============================================================

@function_tool
def send_trip_email_tool(
    subject: str,
    body: str
) -> str:
    """Send an email with trip details to the current user.

    Args:
        subject: Email subject line.
        body: Email body content.
    """

    result = send_email(
        current_user_email,
        subject,
        body
    )

    tool_call_log.append({
        "tool": "email",
        "data": {
            "to": current_user_email,
            "subject": subject
        }
    })

    return (
        f"Trip details emailed to "
        f"{current_user_email}"
    )


# ============================================================
# CREATE THE AGENT
# ============================================================

travel_agent = Agent(

    name="TravelPlannerAgent",

    instructions="""
You are a helpful travel planning assistant.

Use the available tools to get weather information,
search for flights, and find hotels.

Help users plan their trips by providing relevant
information and suggestions.

Remember user preferences (like seat choice, budget,
preferred airlines) using save_preference_tool
whenever the user states one.

At the start of helping with a new request, check
existing preferences using the authenticated user_id
provided in the system context.

Never use "demo_user".

When the user asks to email them the trip details,
itinerary, or summary, use send_trip_email_tool with
a clear subject line and a well-formatted body
summarizing the relevant trip info discussed so far
in the conversation.

If the user shares their name or tells you something
about themselves (their intro/bio), save it using
save_preference_tool with key 'name' or 'bio'
respectively.

At the start of a conversation, if you have their
name saved in preferences, greet them by name
naturally.

If they ask "what's my name" or "do you know me"
or similar, check get_preferences_tool and answer
using what's saved, rather than saying you don't know.

If the user asks who built you, who created you,
or who Syed Salman Ali is, respond warmly that you
were built by Syed Salman Ali as a travel planning
AI agent project, and that he can be found on
GitHub (github.com/sa8385123-creator), LinkedIn,
and TikTok, with links available in the app's footer.
""",

    model=model,

    tools=[
        get_weather_tool,
        search_flights_tool,
        search_hotels_tool,
        save_preference_tool,
        get_preferences_tool,
        send_trip_email_tool
    ],
)


# ============================================================
# LOCAL TEST
# ============================================================

if __name__ == "__main__":

    import asyncio

    async def main():

        result = await Runner.run(
            travel_agent,
            "What's the weather in Paris and find me "
            "a flight from New York to Paris on 2026-11-01"
        )

        print(result.final_output)

    asyncio.run(main())