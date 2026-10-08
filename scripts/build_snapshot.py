"""Build js/realData.js - the real-data snapshot the dashboard reads.

Two modes:

  # 1. Query Elasticsearch directly and write raw responses + the snapshot
  ES_URL=https://... ES_API_KEY=... python scripts/build_snapshot.py --fetch --usage-end 2026-09-30

  # 2. Rebuild the snapshot from previously saved raw responses
  python scripts/build_snapshot.py --raw-dir scripts/raw

--usage-end is the first day NOT included in the usage window (exclusive).
Pick the day after the last complete day of game data - at the time of the
first snapshot, GAME_START/GAME_END ingestion stopped on 30 Sep 2026 (only
PINGs and one test device have flowed since), so the default is 2026-09-30.

Sources:
  usagelog-*  one doc per game session (duration in seconds, generic_string =
              game id, partner_name, geoip, device_type). Used for all usage.
  eventlog-*  raw device events. Used for fleet/last-seen (PING etc.),
              device errors (SPDLOG, generic_string = log line) and event volume.
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_SESSION_SECONDS = 4 * 3600  # drops clock-skew artefacts (negative / multi-hour sessions)


def windows(usage_end: date):
    d = lambda n: (usage_end - timedelta(days=n)).isoformat()
    return {
        'usage_end': usage_end.isoformat(),
        'usage90_from': d(90),
        'usage30_from': d(30),
        'last7_from': d(7),
        'half_from': d(15),
    }


def queries(w):
    session_filter = [
        {'range': {'@timestamp': {'gte': w['usage90_from'], 'lt': w['usage_end']}}},
        {'range': {'duration': {'gte': 0, 'lte': MAX_SESSION_SECONDS}}},
    ]
    last30 = {'range': {'@timestamp': {'gte': w['usage30_from'], 'lt': w['usage_end']}}}
    return {
        'usage_by_device': ('usagelog-*', {
            'size': 0, 'query': {'bool': {'filter': session_filter}},
            'aggs': {'dev': {'terms': {'field': 'serial', 'size': 6000}, 'aggs': {
                'days': {'date_histogram': {'field': '@timestamp', 'calendar_interval': 'day', 'min_doc_count': 1},
                         'aggs': {'s': {'sum': {'field': 'duration'}}}},
                'latest': {'top_hits': {'size': 1, 'sort': [{'@timestamp': 'desc'}], '_source': [
                    'device_type', 'partner_name', 'geoip.country_iso_code', 'geoip.location', 'geoip.city_name',
                    'software_version', 'firmware_version', '@timestamp']}},
                'first': {'min': {'field': '@timestamp'}},
            }}},
        }),
        'games': ('usagelog-*', {
            'size': 0, 'query': {'bool': {'filter': session_filter}},
            'aggs': {
                'g30': {'filter': {'range': {'@timestamp': {'gte': w['usage30_from']}}}, 'aggs': {
                    'g': {'terms': {'field': 'generic_string.keyword', 'size': 500}, 'aggs': {
                        's': {'sum': {'field': 'duration'}},
                        'd': {'cardinality': {'field': 'serial', 'precision_threshold': 5000}},
                        'dt': {'terms': {'field': 'device_type', 'size': 10}, 'aggs': {'s': {'sum': {'field': 'duration'}}}},
                    }}}},
                'g': {'terms': {'field': 'generic_string.keyword', 'size': 500}, 'aggs': {
                    'days': {'date_histogram': {'field': '@timestamp', 'calendar_interval': 'day', 'min_doc_count': 1},
                             'aggs': {'s': {'sum': {'field': 'duration'}}}}}},
                'hours': {'terms': {'field': 'hour_of_day', 'size': 24}, 'aggs': {'s': {'sum': {'field': 'duration'}}}},
            },
        }),
        'fleet': ('eventlog-*', {
            'size': 0, 'query': {'bool': {'filter': [
                {'range': {'@timestamp': {'gte': w['usage90_from']}}},
                {'terms': {'event.keyword': ['PING', 'GAME_START', 'GAME_END', 'STARTUP', 'VPN_CONNECT', 'SHUTDOWN', 'SELECT_MENU']}},
            ]}},
            'aggs': {'dev': {'terms': {'field': 'serial.keyword', 'size': 6000}, 'aggs': {
                'last': {'max': {'field': '@timestamp'}},
                'lastPing': {'filter': {'term': {'event.keyword': 'PING'}}, 'aggs': {'t': {'max': {'field': '@timestamp'}}}},
                'latest': {'top_hits': {'size': 1, 'sort': [{'@timestamp': 'desc'}], '_source': [
                    'device_type', 'partner_name', 'geoip.country_iso_code', 'geoip.location', 'geoip.city_name',
                    'software_version', 'firmware_version', 'hostname', 'event']}},
                'startups30': {'filter': {'bool': {'filter': [{'term': {'event.keyword': 'STARTUP'}}, last30]}}},
            }}},
        }),
        'geo': ('eventlog-*', {
            'size': 0, 'query': {'bool': {'filter': [
                {'range': {'@timestamp': {'gte': w['usage90_from']}}},
                {'terms': {'event.keyword': ['PING', 'GAME_START', 'STARTUP', 'VPN_CONNECT']}},
                {'exists': {'field': 'geoip.country_iso_code'}},
            ]}},
            'aggs': {'dev': {'terms': {'field': 'serial.keyword', 'size': 6000}, 'aggs': {
                'g': {'top_hits': {'size': 1, 'sort': [{'@timestamp': 'desc'}], '_source': [
                    'geoip.country_iso_code', 'geoip.location', 'geoip.city_name', 'software_version', 'partner_name']}}}}},
        }),
        'errors': ('eventlog-*', {
            'size': 0, 'query': {'bool': {'filter': [last30, {'term': {'event.keyword': 'SPDLOG'}}]}},
            'aggs': {
                'daily': {'date_histogram': {'field': '@timestamp', 'calendar_interval': 'day'},
                          'aggs': {'d': {'cardinality': {'field': 'serial.keyword'}}}},
                'ver': {'terms': {'field': 'software_version.keyword', 'size': 30}, 'aggs': {'d': {'cardinality': {'field': 'serial.keyword'}}}},
                'msg': {'terms': {'field': 'generic_string.keyword', 'size': 25}, 'aggs': {'d': {'cardinality': {'field': 'serial.keyword'}}}},
                'dev': {'terms': {'field': 'serial.keyword', 'size': 6000}, 'aggs': {
                    'last7': {'filter': {'range': {'@timestamp': {'gte': w['last7_from']}}}},
                    'top': {'terms': {'field': 'generic_string.keyword', 'size': 1}},
                    'first': {'min': {'field': '@timestamp'}},
                }},
            },
        }),
        'events': ('eventlog-*', {
            'size': 0, 'query': last30,
            'aggs': {
                'daily': {'date_histogram': {'field': '@timestamp', 'calendar_interval': 'day'}, 'aggs': {
                    'missing': {'filter': {'bool': {'should': [
                        {'bool': {'must_not': {'exists': {'field': 'serial.keyword'}}}},
                        {'bool': {'must_not': {'exists': {'field': 'software_version.keyword'}}}},
                        {'term': {'software_version.keyword': 'null'}},
                    ]}}},
                    'ev': {'terms': {'field': 'event.keyword', 'size': 40}},
                    'dev': {'cardinality': {'field': 'serial.keyword'}},
                }},
                'startupsByVersion': {'filter': {'term': {'event.keyword': 'STARTUP'}}, 'aggs': {
                    'v': {'terms': {'field': 'software_version.keyword', 'size': 40}, 'aggs': {'d': {'cardinality': {'field': 'serial.keyword'}}}}}},
                'devByVersion': {'terms': {'field': 'software_version.keyword', 'size': 60},
                                 'aggs': {'d': {'cardinality': {'field': 'serial.keyword', 'precision_threshold': 5000}}}},
            },
        }),
        'feed': ('eventlog-*', {
            'size': 30, 'sort': [{'@timestamp': 'desc'}],
            '_source': ['@timestamp', 'event', 'serial', 'generic_string', 'payload.name'],
            'query': {'bool': {'filter': [
                {'range': {'@timestamp': {'gte': w['last7_from']}}},
                {'terms': {'event.keyword': ['STARTUP', 'VPN_CONNECT', 'VPN_DISCONNECT', 'SHUTDOWN', 'GAME_START', 'GAME_END']}},
                {'exists': {'field': 'serial.keyword'}},
            ]}},
            'collapse': {'field': 'serial.keyword'},
        }),
    }


def es_search(index, body):
    url = os.environ['ES_URL'].rstrip('/') + f'/{index}/_search'
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json'})
    if os.environ.get('ES_API_KEY'):
        req.add_header('Authorization', 'ApiKey ' + os.environ['ES_API_KEY'])
    elif os.environ.get('ES_USER'):
        tok = base64.b64encode(f"{os.environ['ES_USER']}:{os.environ.get('ES_PASSWORD', '')}".encode()).decode()
        req.add_header('Authorization', 'Basic ' + tok)
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


# ---------------------------------------------------------------------------
# Transform raw responses into the compact snapshot shape data.js consumes
# ---------------------------------------------------------------------------

def day(ts_ms):
    return datetime.fromtimestamp(ts_ms / 1000, timezone.utc).date().isoformat()


def clean_version(v):
    return None if v in (None, '', 'null') else v


def transform(raw, w, snapshot_at):
    usage_end = date.fromisoformat(w['usage_end'])
    last7_days = [(usage_end - timedelta(days=i)).isoformat() for i in range(7, 0, -1)]

    # usage per device ------------------------------------------------------
    usage = {}
    usage_daily = {}
    for b in raw['usage_by_device']['aggregations']['dev']['buckets']:
        per_day = {x['key_as_string'][:10]: (x['s']['value'], x['doc_count']) for x in b['days']['buckets']}
        for dstr, (secs, n) in per_day.items():
            agg = usage_daily.setdefault(dstr, [0, 0, 0])
            agg[0] += secs; agg[1] += n; agg[2] += 1
        in30 = {k: v for k, v in per_day.items() if k >= w['usage30_from']}
        src = b['latest']['hits']['hits'][0]['_source']
        usage[b['key']] = {
            'minutes30': round(sum(v[0] for v in in30.values()) / 60),
            'sessions30': sum(v[1] for v in in30.values()),
            'activeDays30': len(in30),
            'minutesLast15': round(sum(v[0] for k, v in in30.items() if k >= w['half_from']) / 60),
            'minutesPrev15': round(sum(v[0] for k, v in in30.items() if k < w['half_from']) / 60),
            'trend7d': [round(per_day.get(dd, (0, 0))[0] / 60) for dd in last7_days],
            'deviceType': src.get('device_type'),
            'partner': src.get('partner_name'),
            'geo': src.get('geoip') or {},
            'softwareVersion': clean_version(src.get('software_version')),
            'firstUsage': b['first']['value'],
        }

    # geo / version fallbacks ----------------------------------------------
    geo = {b['key']: b['g']['hits']['hits'][0]['_source'] for b in raw['geo']['aggregations']['dev']['buckets']}

    # errors -----------------------------------------------------------------
    eagg = raw['errors']['aggregations']
    errors = {b['key']: {
        'errors30d': b['doc_count'],
        'errors7d': b['last7']['doc_count'],
        'topError': b['top']['buckets'][0]['key'] if b['top']['buckets'] else None,
        'firstError': b['first']['value'],
    } for b in eagg['dev']['buckets']}

    # fleet ------------------------------------------------------------------
    devices = []
    for b in raw['fleet']['aggregations']['dev']['buckets']:
        s = b['key']
        src = b['latest']['hits']['hits'][0]['_source']
        g = geo.get(s, {})
        u = usage.get(s, {})
        gg = g.get('geoip') or u.get('geo') or src.get('geoip') or {}
        loc = gg.get('location') or {}
        e = errors.get(s, {})
        devices.append({
            'serial': s,
            'deviceType': src.get('device_type') or u.get('deviceType'),
            'partner': src.get('partner_name') or g.get('partner_name') or u.get('partner'),
            'countryCode': gg.get('country_iso_code'),
            'city': gg.get('city_name'),
            'lat': loc.get('lat'), 'lon': loc.get('lon'),
            'softwareVersion': clean_version(src.get('software_version')) or clean_version(g.get('software_version')) or u.get('softwareVersion'),
            'lastSeenAt': int(b['last']['value']),
            'startups30': b['startups30']['doc_count'],
            'minutes30': u.get('minutes30', 0), 'sessions30': u.get('sessions30', 0),
            'activeDays30': u.get('activeDays30', 0), 'trend7d': u.get('trend7d', [0] * 7),
            'minutesLast15': u.get('minutesLast15', 0), 'minutesPrev15': u.get('minutesPrev15', 0),
            'errors7d': e.get('errors7d', 0), 'errors30d': e.get('errors30d', 0),
            'topError': e.get('topError'), 'firstErrorAt': e.get('firstError'),
        })

    usage_daily_rows = [{'date': k, 'minutes': round(v[0] / 60), 'sessions': v[1], 'devices': v[2]}
                        for k, v in sorted(usage_daily.items())]

    gagg = raw['games']['aggregations']
    games30 = [{'key': b['key'], 'minutes': round(b['s']['value'] / 60), 'sessions': b['doc_count'], 'devices': b['d']['value'],
                'byDeviceType': {str(x['key']): round(x['s']['value'] / 60) for x in b['dt']['buckets']}}
               for b in gagg['g30']['g']['buckets']]
    last_day = (usage_end - timedelta(days=1)).isoformat()
    games_last_day = sorted(
        ({'key': b['key'], 'sessions': x['doc_count']} for b in gagg['g']['buckets'] for x in b['days']['buckets']
         if x['key_as_string'][:10] == last_day), key=lambda r: -r['sessions'])
    hours = sorted(({'hour': b['key'], 'minutes': round(b['s']['value'] / 60)} for b in gagg['hours']['buckets']), key=lambda r: r['hour'])

    evagg = raw['events']['aggregations']
    events_daily = [{'date': b['key_as_string'][:10], 'events': b['doc_count'], 'missing': b['missing']['doc_count'], 'devices': b['dev']['value'],
                     'byEvent': {x['key']: x['doc_count'] for x in b['ev']['buckets']}} for b in evagg['daily']['buckets']]

    feed = []
    for h in raw['feed']['hits']['hits']:
        src = h['_source']
        game = None
        if src['event'].startswith('GAME_'):
            game = src.get('generic_string') or (src.get('payload') or {}).get('name')
        feed.append({'time': src['@timestamp'], 'event': src['event'], 'serial': src.get('serial'), 'game': game})

    return {
        'meta': {
            'snapshotAt': snapshot_at,
            'usageFrom': w['usage90_from'], 'usageTo': last_day,
            'usage30From': w['usage30_from'], 'last7From': w['last7_from'],
            'sources': ['usagelog-* (game sessions)', 'eventlog-* (PING / SPDLOG / lifecycle events)'],
        },
        'devices': devices,
        'usageDaily': usage_daily_rows,
        'games30': games30,
        'gamesLastDay': games_last_day,
        'hours': hours,
        'eventsDaily': events_daily,
        'errorsDaily': [{'date': b['key_as_string'][:10], 'errors': b['doc_count'], 'devices': b['d']['value']} for b in eagg['daily']['buckets']],
        'errorsByVersion': [{'version': b['key'], 'errors': b['doc_count'], 'devices': b['d']['value']} for b in eagg['ver']['buckets']],
        'errorMessages': [{'message': b['key'], 'count': b['doc_count'], 'devices': b['d']['value']} for b in eagg['msg']['buckets']],
        'startupsByVersion': [{'version': b['key'], 'startups': b['doc_count'], 'devices': b['d']['value']} for b in evagg['startupsByVersion']['v']['buckets']],
        'devicesByVersion': [{'version': b['key'], 'devices': b['d']['value']} for b in evagg['devByVersion']['buckets']],
        'feed': feed,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fetch', action='store_true', help='query Elasticsearch (needs ES_URL and ES_API_KEY or ES_USER/ES_PASSWORD)')
    ap.add_argument('--raw-dir', default=str(ROOT / 'scripts' / 'raw'))
    ap.add_argument('--usage-end', default='2026-09-30', help='exclusive end date of the usage window (YYYY-MM-DD)')
    ap.add_argument('--snapshot-at', default=None, help='ISO timestamp treated as "now" (defaults to fetch time)')
    ap.add_argument('--out', default=str(ROOT / 'js' / 'realData.js'))
    args = ap.parse_args()

    w = windows(date.fromisoformat(args.usage_end))
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    names = list(queries(w).keys())

    if args.fetch:
        for name, (index, body) in queries(w).items():
            print('querying', name, file=sys.stderr)
            (raw_dir / f'{name}.json').write_text(json.dumps(es_search(index, body)))
    raw = {n: json.loads((raw_dir / f'{n}.json').read_text()) for n in names}

    snapshot_at = args.snapshot_at or datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    snap = transform(raw, w, snapshot_at)
    Path(args.out).write_text(
        '// Generated by scripts/build_snapshot.py - do not edit by hand.\n'
        f'// Real Elasticsearch snapshot taken {snapshot_at}.\n'
        'export const SNAPSHOT = ' + json.dumps(snap, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f"wrote {args.out}: {len(snap['devices'])} devices, {len(snap['games30'])} games", file=sys.stderr)


if __name__ == '__main__':
    main()
