#!/usr/bin/env python3
"""
Generate comprehensive weekly report for Meta Ads accounts.
Usage: python3 generate_report.py <ad_account_id> <start_date> <end_date>
Example: python3 generate_report.py act_753487635197711 2026-03-09 2026-03-15
"""

import os
import sys
import json
import requests
from datetime import datetime

# Client mapping
CLIENTS = {
    "act_753487635197711": {"name": "Aasen Auto AS", "currency": "NOK", "email": "post@aasenauto.no"},
    "act_14246673": {"name": "Naka Autosport AS", "currency": "NOK", "email": "espen@naka.no"},
    "act_996950670679944": {"name": "Stjordal Autosalg AS", "currency": "NOK", "email": "post@stjordal-autosalg.no"},
    "act_3929508630480150": {"name": "Hanebrekke Service AS", "currency": "NOK", "email": "fredrik.hanebrekke@gmail.com"},
    "act_703535410118805": {"name": "Polyalkemi", "currency": "NOK", "email": None},
}

# Alias for backwards compat
ACCOUNTS = CLIENTS

def load_token():
    token_path = os.path.expanduser("~/.config/meta_ads.env")
    with open(token_path) as f:
        for line in f:
            if line.startswith("META_FB_TOKEN="):
                return line.split("=", 1)[1].strip()

def fetch_all_insights(token, ad_account_id, start_date, end_date):
    """Fetch comprehensive insights data."""
    
    results = {}
    
    # 1. Account-level summary
    url = f"https://graph.facebook.com/v21.0/{ad_account_id}/insights"
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "impressions,clicks,spend,cpc,ctr,reach,frequency,conversions,conversion_values,cpm",
    }
    resp = requests.get(url, params=params)
    data = resp.json().get("data", [])
    results["account"] = data[0] if data else {}
    
    # 2. Campaigns
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "impressions,clicks,spend,cpc,ctr,campaign_name",
        "level": "campaign",
    }
    resp = requests.get(url, params=params)
    results["campaigns"] = resp.json().get("data", [])
    
    # 3. Ads
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "impressions,clicks,spend,cpc,ctr,ad_name",
        "level": "ad",
    }
    resp = requests.get(url, params=params)
    results["ads"] = resp.json().get("data", [])
    
    # 4. Actions breakdown
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "actions,impressions,clicks,spend",
        "action_breakdown": "action_type",
    }
    resp = requests.get(url, params=params)
    actions_data = resp.json().get("data", [{}])[0]
    results["actions"] = actions_data.get("actions", [])
    
    # 5. Daily breakdown
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": start_date, "until": end_date}),
        "fields": "impressions,clicks,spend,date_start",
    }
    resp = requests.get(url, params=params)
    results["daily"] = resp.json().get("data", [])
    
    return results

def format_report(ad_account_id, start_date, end_date, data):
    """Format data into a readable report."""
    
    client = CLIENTS.get(ad_account_id, {"name": "Unknown", "currency": "NOK"})
    acc = data.get("account", {})
    
    # Format dates nicely
    start = datetime.strptime(start_date, "%Y-%m-%d").strftime("%d.%m.%Y")
    end = datetime.strptime(end_date, "%Y-%m-%d").strftime("%d.%m.%Y")
    
    report = f"""
================================================================================
{client['name'].upper():<80}
Report Period: {start} - {end}
================================================================================

OVERSIKT
--------------------------------------------------------------------------------
Total Spend:        {float(acc.get('spend', 0)):.2f} {client['currency']}
Impressions:        {int(acc.get('impressions', 0)):,}
Link Clicks:        {int(acc.get('clicks', 0)):,}
CTR:                {float(acc.get('ctr', 0)):.2f}%
CPC:                {float(acc.get('cpc', 0)):.2f} {client['currency']}
Reach:              {int(acc.get('reach', 0)):,}
Frequency:          {float(acc.get('frequency', 0)):.2f}
CPM:                {float(acc.get('cpm', 0)):.2f} {client['currency']}

"""
    
    # Campaigns
    if data.get("campaigns"):
        report += "KAMPANJER\n"
        report += "-" * 80 + "\n"
        for c in data["campaigns"]:
            report += f"  {c.get('campaign_name', 'N/A'):<40} {c['spend']:>8} {client['currency']}  {c['clicks']:>5} klikk\n"
        report += "\n"
    
    # Ads
    if data.get("ads"):
        report += "ANNONSER\n"
        report += "-" * 80 + "\n"
        for a in data["ads"]:
            name = a.get('ad_name', 'N/A')[:35]
            report += f"  {name:<40} {a['spend']:>8} {client['currency']}  {a['clicks']:>5} klikk\n"
        report += "\n"
    
    # Actions
    if data.get("actions"):
        report += "HANDLINGER\n"
        report += "-" * 80 + "\n"
        
        action_names = {
            "link_click": "Klikk paa lenke",
            "page_engagement": "Sideengasjement",
            "landing_page_view": "Landingsside-visning",
            "view_content": "Innholdsvisning",
            "post_engagement": "Innlegg-engasjement",
            "post_reaction": "Reaksjon",
            "lead": "Lead (direkte)",
            "lead_grouped": "Lead (gruppert)",
        }
        
        for a in data["actions"]:
            action = a.get("action_type", "unknown")
            name = action_names.get(action, action)
            value = a.get("value", "0")
            report += f"  {name:<35} {value:>10}\n"
        report += "\n"
    
    # Daily breakdown
    if data.get("daily"):
        report += "DAGLIG OVERSIKT\n"
        report += "-" * 80 + "\n"
        for d in data["daily"]:
            date = datetime.strptime(d.get("date_start", ""), "%Y-%m-%d").strftime("%a %d.%m")
            report += f"  {date:<15} {d['impressions']:>8} impr  {d['clicks']:>5} klikk  {float(d['spend']):>8.2f} {client['currency']}\n"
        report += "\n"
    
    return report

def generate_email_body(ad_account_id, start_date, end_date, data):
    """Generate email body text matching Casper's preferred format."""

    client = CLIENTS.get(ad_account_id, {"name": "Unknown", "currency": "NOK"})
    acc = data.get("account", {})
    campaigns = data.get("campaigns", [])
    ads = data.get("ads", [])
    actions = data.get("actions", [])

    # Date formatting
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    start_fmt = start_dt.strftime("%d.%m")
    end_fmt = end_dt.strftime("%d.%m.%Y")

    # Week number
    week = start_dt.isocalendar()[1]
    date_range = f"{start_fmt}-{end_fmt}"

    # Format numbers
    spend = float(acc.get("spend", 0) or 0)
    impressions = int(acc.get("impressions", 0) or 0)
    clicks = int(acc.get("clicks", 0) or 0)
    ctr = float(acc.get("ctr", 0) or 0)
    cpc = float(acc.get("cpc", 0) or 0)
    reach = int(acc.get("reach", 0) or 0)

    # Get leads — only Meta "lead" events
    leads = 0
    for a in actions:
        if a.get("action_type") in ("lead", "lead_grouped", "lead_grouped_total"):
            leads += int(a.get("value", 0) or 0)

    # Campaign lines
    campaign_lines = ""
    for c in campaigns:
        cname = c.get("campaign_name", "-")
        cspend = float(c.get("spend", 0) or 0)
        cclicks = int(c.get("clicks", 0) or 0)
        campaign_lines += f"- {cname}: {cspend:.2f} NOK ({cclicks} klikk)\n"

    # Ad lines
    ad_lines = ""
    for a in ads:
        aname = a.get("ad_name", "-")
        aspend = float(a.get("spend", 0) or 0)
        aclicks = int(a.get("clicks", 0) or 0)
        ad_lines += f"- {aname}: {aspend:.2f} NOK ({aclicks} klikk)\n"

    # Simple analysis
    freq = float(acc.get("frequency", 0) or 0)
    analysis = []
    if ctr > 5:
        analysis.append(f"God CTR paa {ctr:.2f}%")
    if cpc < 3:
        analysis.append(f"lav CPC paa {cpc:.2f} NOK")
    if 1.5 <= freq <= 3:
        analysis.append(f"Frekvensen paa {freq:.2f} er optimal")
    if leads == 0 and spend > 500:
        analysis.append("ingen henvendelser denne uken")

    if analysis:
        sentences = [a[0].upper() + a[1:] if len(a) > 1 else a.upper() for a in analysis]
        analysis_text = ". ".join(sentences) + "."
    else:
        analysis_text = "Resultatene ser bra ut denne uken."

    body = f"""Hei,

God mandag! Vedlagt finner du rapport for {client['name']} for uke {week} ({date_range}).

- Spend: {spend:.2f} NOK
- Visninger: {impressions:,}
- Klikk: {clicks:,}
- Klikkrate: {ctr:.2f}%
- Kostnad per klikk: {cpc:.2f} NOK
- Rekkevidde: {reach:,}
- Henvendelser direkte fra annonser: {leads:,}

Kampanjer:
{campaign_lines}
Annonser:
{ad_lines}
{analysis_text}

Ha en fin uke!

Med vennlig hilsen,
Casper"""

    return body

def generate_report(ad_account_id, start_date, end_date):
    """Fetch and return report data dict. Importable for programmatic use."""
    token = load_token()
    data = fetch_all_insights(token, ad_account_id, start_date, end_date)
    return data


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 generate_report.py <ad_account_id> <start_date> <end_date>")
        print("Example: python3 generate_report.py act_753487635197711 2026-03-09 2026-03-15")
        sys.exit(1)
    
    ad_account_id = sys.argv[1]
    start_date = sys.argv[2]
    end_date = sys.argv[3]
    
    token = load_token()
    data = fetch_all_insights(token, ad_account_id, start_date, end_date)
    
    # Output report
    report = format_report(ad_account_id, start_date, end_date, data)
    print(report)
    
    # Also output JSON for programmatic use
    print("\n[JSON_OUTPUT]")
    print(json.dumps(data, indent=2))
