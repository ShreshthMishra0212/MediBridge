import os
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def main():
    creds = None
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    TOKEN_PATH = os.path.join(BASE_DIR, "token.json")
    CREDS_PATH = os.path.join(BASE_DIR, "credentials.json")
    
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print("Old token is revoked or expired. We will generate a new one.")
                creds = None # Force a new login
                
        if not creds:
            if not os.path.exists(CREDS_PATH):
                print("ERROR: credentials.json not found!")
                print(f"Please download credentials.json from Google Cloud Console")
                print(f"(OAuth 2.0 Client IDs -> Desktop application) and place it here:\n{CREDS_PATH}")
                return
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDS_PATH, SCOPES
            )
            creds = flow.run_local_server(port=0)
            
        # Save the credentials for the next run
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
            
    print("Success! token.json has been generated.")

if __name__ == "__main__":
    main()
