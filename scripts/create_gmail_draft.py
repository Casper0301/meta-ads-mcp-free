#!/usr/bin/env python3
"""
create_gmail_draft.py
Creates a Gmail draft using a service-account delegated token.
Usage: python3 create_gmail_draft.py <to_email> <subject> <body_text>
"""
import sys, base64, subprocess, json, requests
from email.mime.text import MIMEText

def get_token():
    result = subprocess.run(
        ['node', '/home/clawd/.config/gws/gws-delegated.js', '--token-only'],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout.strip()

def create_draft(token, to_email, subject, body):
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['To'] = to_email
    msg['Subject'] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    resp = requests.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={'message': {'raw': raw}}
    )
    return resp.json()

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: create_gmail_draft.py <to> <subject> <body>")
        sys.exit(1)

    to_email = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]

    token = get_token()
    if not token or len(token) < 50:
        print(f"ERROR: Bad token: {token[:50]}")
        sys.exit(1)

    result = create_draft(token, to_email, subject, body)
    if 'error' in result:
        print(f"ERROR: {result['error']['message']}")
        sys.exit(1)
    else:
        print(f"OK: Draft created for {to_email}")
