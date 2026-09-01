
import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


SCOPES = [
    "https://www.googleapis.com/auth/calendar"
]

# MediBridge is operating in India
IST = datetime.timezone(
    datetime.timedelta(hours=5, minutes=30)
)


def get_credentials():

    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    TOKEN_PATH = os.path.join(BASE_DIR, "token.json")

    if not os.path.exists(TOKEN_PATH):
        raise FileNotFoundError(
            "token.json not found! Please run generate_google_token.py "
            "with your credentials.json to authorize Google Calendar API."
        )

    creds = Credentials.from_authorized_user_file(
        TOKEN_PATH,
        SCOPES
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(
                Request()
            )

            with open(
                TOKEN_PATH,
                "w"
            ) as f:

                f.write(
                    creds.to_json()
                )
        except Exception as e:
            raise RuntimeError(
                f"Google Calendar token is expired or revoked. Please run generate_google_token.py again to login. Error: {e}"
            )

    return creds


def create_google_meet(
    start_time,
    title="MediBridge Doctor Appointment",
    duration_minutes=30
):

    # --------------------------------------------------
    # MAKE SURE START TIME HAS TIMEZONE
    # --------------------------------------------------

    if start_time.tzinfo is None:

        # Slot times coming from MediBridge are treated as IST
        start_time = start_time.replace(
            tzinfo=IST
        )

    # Convert to UTC for Google Calendar
    start_time_utc = start_time.astimezone(
        datetime.timezone.utc
    )

    end_time = (
        start_time
        + datetime.timedelta(
            minutes=duration_minutes
        )
    )

    end_time_utc = end_time.astimezone(
        datetime.timezone.utc
    )

    # --------------------------------------------------
    # GOOGLE AUTH
    # --------------------------------------------------

    creds = get_credentials()

    service = build(
        "calendar",
        "v3",
        credentials=creds
    )

    # --------------------------------------------------
    # CREATE GOOGLE CALENDAR EVENT
    # --------------------------------------------------

    event = {

        "summary": title,

        "start": {
            "dateTime": start_time_utc.isoformat(),
            "timeZone": "UTC"
        },

        "end": {
            "dateTime": end_time_utc.isoformat(),
            "timeZone": "UTC"
        },

        "conferenceData": {

            "createRequest": {

                "requestId":
                    f"medibridge-{int(start_time.timestamp())}",

                "conferenceSolutionKey": {
                    "type": "hangoutsMeet"
                }
            }
        }
    }

    created = (
        service
        .events()
        .insert(
            calendarId="primary",
            body=event,
            conferenceDataVersion=1
        )
        .execute()
    )

    # --------------------------------------------------
    # GET MEET URL
    # --------------------------------------------------

    join_url = created.get(
        "hangoutLink"
    )

    if not join_url:

        # Fallback if hangoutLink isn't returned
        conference_data = created.get(
            "conferenceData",
            {}
        )

        entry_points = conference_data.get(
            "entryPoints",
            []
        )

        for entry in entry_points:

            if entry.get("entryPointType") == "video":

                join_url = entry.get(
                    "uri"
                )

                break

    if not join_url:

        raise RuntimeError(
            "Google Meet link was not generated"
        )

    return {

        "join_url": join_url,

        "event_id":
            created["id"],

        # Return original IST time
        "start_time":
            start_time,

        "expires_at":
            end_time
    }
