# meeting_generator.py
import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def get_credentials():
    creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open("token.json", "w") as f:
            f.write(creds.to_json())
    return creds

def create_google_meet(start_time, title="Quick Meeting", duration_minutes=60):
    creds = get_credentials()
    service = build("calendar", "v3", credentials=creds)

    end_time = start_time + datetime.timedelta(minutes=duration_minutes)

    event = {
        "summary": title,
        "start": {"dateTime": start_time.isoformat() + "Z"},
        "end": {"dateTime": end_time.isoformat() + "Z"},
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet-{int(start_time.timestamp())}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"}
            }
        }
    }

    created = service.events().insert(
        calendarId="primary", body=event, conferenceDataVersion=1
    ).execute()

    return {
        "join_url": created["hangoutLink"],
        "event_id": created["id"],
        "start_time": start_time,
        "expires_at": end_time
    }
