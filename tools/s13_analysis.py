"""Small fail-closed S13 paired-trace analysis; all rates use virtual seconds."""
import copy
import hashlib
import json
import math
import statistics

CONFIG = dict(board='16x8', starting_balls=32, cannons=2, logical_ticks=2,
              work_budget=512, callback_pacing_seconds=1, page_records=64,
              retention_segments=3, retention_bytes=8388608)


def identity(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def cases(profile):
    if profile == 'smoke':
        plans = [('smoke', 8, 64, 'none', 0, 32, 1)]
    elif profile == 'extended':
        plans = [(name, period, batch, 'alternating', 0, 128, 1)
                 for name, period, batch in [('idle', 1, 0), ('moderate', 8, 64),
                                             ('higher', 2, 64), ('overload', 1, 128)]]
        plans += [(f'no-hints-{name}', period, batch, 'none', 0, 128, 1)
                  for name, period, batch in [('idle', 1, 0), ('moderate', 8, 64), ('higher', 2, 64)]]
        plans += [('backlog', 8, 64, 'none', 512, 128, 1)]
        plans += [(name, period, 64, 'alternating', 0, 128, 2)
                  for name, period in [('moderate', 8), ('higher', 2)]]
    else:
        raise ValueError('unknown profile')
    return [dict(id=f'{name}-r{repeat}-f{fallback}', pair=f'{name}-r{repeat}',
                 arrival_period_seconds=period, arrival_batch=batch, hints=hints,
                 initial_tip=tip, duration_seconds=duration, repetition=repeat,
                 fallback_seconds=fallback) for name, period, batch, hints, tip, duration, repeat in plans
            for fallback in (1, 5)]


def validate_trace(trace, expected):
    for key in ('source', 'normal_wasm_sha256', 'workload_sha256', 'harness_sha256',
                'runtime_sha256', 'model_configuration_sha256'):
        if key not in trace or trace[key] != expected[key]:
            raise ValueError(f'incompatible trace {key}')
    if trace.get('status') != 'PASS' or trace.get('schema') != 'btz-s13-case-v1':
        raise ValueError('incomplete or wrong trace')
    if trace.get('case') != expected['case'] or trace.get('configuration') != CONFIG:
        raise ValueError('incompatible case/configuration')
    rows = trace.get('trace', [])
    spec = trace['case']
    if len(rows) != spec['duration_seconds']:
        raise ValueError('missing observation intervals')
    previous_cursor = 0
    previous_tip = spec['initial_tip']
    previous_time = 0
    previous_calls = 0
    for i, row in enumerate(rows, 1):
        tip = spec['initial_tip'] + i // spec['arrival_period_seconds'] * spec['arrival_batch']
        if (row['ledger_tip'] != tip or row['new_arrivals'] != tip - previous_tip
            or row['verified_cursor'] < previous_cursor or row['verified_cursor'] > tip
            or row['records_verified'] != row['verified_cursor'] - previous_cursor
            or row['backlog'] != tip - row['verified_cursor']
            or row['ledger_calls'] < previous_calls
            or not math.isclose(row['elapsed_virtual_seconds'], i, abs_tol=0.001)
            or row['elapsed_virtual_seconds'] <= previous_time
            or row['source_error'] is not None or row['run_error'] is not None):
            raise ValueError(f'inconsistent interval {i}')
        previous_cursor, previous_tip, previous_time, previous_calls = (
            row['verified_cursor'], tip, row['elapsed_virtual_seconds'], row['ledger_calls'])
    if trace.get('native_replay') != dict(status='PASS', segments=len(trace['publications']), own_history=True):
        raise ValueError('native own-history replay missing')
    positions = [v['position'] for v in trace['latency']]
    wanted = [p for p in range(previous_tip) if p % 256 < 3]
    if positions != wanted or len(set(positions)) != len(positions):
        raise ValueError('missing or duplicate latency records')
    published = [v for v in trace['latency'] if v['resolution'] == 'PUBLISHED']
    if len(published) != sum(p['input_count'] for p in trace['publications']):
        raise ValueError('assignment counts inconsistent')
    for v in trace['latency']:
        arrival = 0 if v['position'] < spec['initial_tip'] else (
            (v['position'] - spec['initial_tip']) // spec['arrival_batch'] + 1) * spec['arrival_period_seconds']
        if v['arrival_virtual_second'] != arrival:
            raise ValueError('wrong arrival time')
        verification = v['first_observed_verified_virtual_second']
        publication = v['first_observed_publication_virtual_second']
        if (verification is not None and not arrival <= verification <= previous_time
            or publication is not None and (verification is None or not verification <= publication <= previous_time)):
            raise ValueError('impossible latency')
    return trace


def validate_pair(one, five):
    for key in ('source', 'normal_wasm_sha256', 'initial_world_sha256', 'ledger_fixture_sha256',
                'workload_sha256', 'harness_sha256', 'runtime_sha256', 'model_configuration_sha256', 'configuration'):
        if one[key] != five[key]:
            raise ValueError(f'unmatched pair {key}')
    a, b = copy.deepcopy(one['case']), copy.deepcopy(five['case'])
    if a.pop('fallback_seconds') != 1 or b.pop('fallback_seconds') != 5:
        raise ValueError('wrong fallback pairing')
    a.pop('id'); b.pop('id')
    if a != b:
        raise ValueError('unmatched arrival/hint/window configuration')


def distribution(values, total):
    values = sorted(values)
    return dict(completed_samples=len(values), unresolved_samples=total-len(values),
                median=statistics.median(values) if values else 'NOT_MEASURED',
                p95=values[max(0, math.ceil(len(values)*.95)-1)] if values else 'NOT_MEASURED',
                maximum=max(values) if values else 'NOT_MEASURED')


def summarize(trace):
    rows = trace['trace']; end = rows[-1]; spec = trace['case']
    duration = end['elapsed_virtual_seconds']; verified = end['verified_cursor']
    publications = trace['publications']
    times = [p['observed_virtual_second'] for p in publications]
    spacing = [b-a for a,b in zip(times,times[1:])]
    latencies = trace['latency']
    valid = [v for v in latencies if v['kind'] == 'valid_payment']
    outcome = ('OBSERVED_DRAINED' if end['backlog'] == 0 else
               'OBSERVED_GROWING_BACKLOG' if end['backlog'] > spec['initial_tip'] + spec['arrival_batch'] else
               'OBSERVED_BOUNDED')
    half = next((r['elapsed_virtual_seconds'] for r in rows if r['backlog'] <= spec['initial_tip']/2), None) if spec['initial_tip'] else 'NOT_APPLICABLE'
    zero = next((r['elapsed_virtual_seconds'] for r in rows if r['backlog'] == 0), None) if spec['initial_tip'] else 'NOT_APPLICABLE'
    return dict(**spec, outcome=outcome, status=trace['status'],
        offered_records_per_virtual_second=(end['ledger_tip']-spec['initial_tip'])/duration,
        verified_records_per_virtual_second=verified/duration, verified_records=verified,
        final_backlog=end['backlog'], maximum_backlog=max(spec['initial_tip'],max(r['backlog'] for r in rows)),
        backlog_change_per_virtual_second=(end['backlog']-spec['initial_tip'])/duration,
        ledger_calls=end['ledger_calls'], archive_calls=end['archive_calls'],
        empty_polls_observed=end['empty_polls_observed'], successful_source_advances_observed=end['successful_source_advances_observed'],
        ledger_calls_per_virtual_second=end['ledger_calls']/duration,
        successful_source_advances_per_virtual_second=end['successful_source_advances_observed']/duration,
        ledger_calls_per_1000_verified_records=end['ledger_calls']*1000/verified if verified else 'NOT_APPLICABLE',
        archive_calls_per_1000_verified_records=end['archive_calls']*1000/verified if verified else 'NOT_APPLICABLE',
        polls_observed_per_completed_segment=end['empty_polls_observed']/end['completed_segments'],
        completed_segments=end['completed_segments'], game_segments_per_virtual_second=end['completed_segments']/duration,
        publication_spacing=distribution(spacing,len(spacing)), publication_spacing_mean=statistics.mean(spacing),
        callbacks=end['callbacks'], callbacks_per_completed_segment_including_tail=end['callbacks']/end['completed_segments'],
        work_units=end['total_work'], queue_high_water=trace['queue_high_water'],
        stable_bytes=trace['stable_bytes_final'], retained_bytes=end['retained_bytes'],
        backlog_half_time=half, backlog_zero_time=zero,
        relevant_record_samples=len(latencies), valid_payment_samples=len(valid),
        latency={key:distribution([v[key] for v in latencies if v[key] is not None],len(latencies))
                 for key in ('arrival_to_verification_seconds','verification_to_publication_seconds','arrival_to_publication_seconds')},
        valid_payment_latency={key:distribution([v[key] for v in valid if v[key] is not None],len(valid))
                 for key in ('arrival_to_verification_seconds','arrival_to_publication_seconds')},
        unresolved_unverified=sum(v['resolution']=='UNVERIFIED' for v in latencies),
        unresolved_unpublished=sum(v['resolution']=='VERIFIED_UNPUBLISHED' for v in latencies))
