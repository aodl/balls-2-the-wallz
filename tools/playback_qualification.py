"""Read-only analysis of continuous browser counters and independently timed IC polls."""
import bisect
import statistics


def continuous_summary(rows, polls):
    """No trimming/rebuffer resets: use every sample in the supplied >=900s window.

    A query's state snapshot lies between request start and completion. Adjacent
    polls bound production at each browser endpoint; certificate time is not a
    publication timestamp. Buffer conservation uses direct verified counters.
    """
    first, last = rows[0], rows[-1]
    seconds = (last['wall_epoch_ms'] - first['wall_epoch_ms']) / 1000
    if seconds < 900:
        raise ValueError('continuous observation must cover at least 900 seconds')
    ordered = sorted(polls, key=lambda p: p['query_completed_epoch_ms'])
    completions = [p['query_completed_epoch_ms'] for p in ordered]

    def ticks(p):
        return p['segment_id'] * p['publication_ticks']

    def bound(epoch):
        before = [p for p in ordered if p['query_completed_epoch_ms'] <= epoch]
        after = [p for p in ordered if p['query_started_epoch_ms'] >= epoch]
        if not before or not after:
            raise ValueError('independent backend polls must bracket both observation endpoints')
        return [ticks(before[-1]), ticks(after[0])]

    start_bounds, end_bounds = bound(first['wall_epoch_ms']), bound(last['wall_epoch_ms'])
    produced_bounds = [end_bounds[0]-start_bounds[1], end_bounds[1]-start_bounds[0]]
    admitted = last['admitted_ticks'] - first['admitted_ticks']
    displayed = last['played_ticks'] - first['played_ticks']
    buffer_change = last['buffer_ticks'] - first['buffer_ticks']
    conservation_error = buffer_change - (admitted-displayed)
    buckets = []
    for minute in range(15):
        part = [r for r in rows if minute*60 <= (r['wall_epoch_ms']-first['wall_epoch_ms'])/1000 < (minute+1)*60]
        if not part:
            raise ValueError('missing minute in continuous observation')
        buckets.append({'minute':minute, 'samples':len(part),
                        'start':part[0]['buffer_ticks'], 'end':part[-1]['buffer_ticks'],
                        'mean':statistics.mean(r['buffer_ticks'] for r in part),
                        'min':min(r['buffer_ticks'] for r in part),
                        'max':max(r['buffer_ticks'] for r in part)})
    times = [(r['wall_epoch_ms']-first['wall_epoch_ms'])/1000 for r in rows]
    buffers = [r['buffer_ticks'] for r in rows]
    tx, by = statistics.mean(times), statistics.mean(buffers)
    slope = sum((t-tx)*(b-by) for t,b in zip(times,buffers))/sum((t-tx)**2 for t in times)
    mean_change = statistics.mean(b['mean'] for b in buckets[-3:])-statistics.mean(b['mean'] for b in buckets[:3])
    ages = []
    aligned = []
    for row in rows:
        i = bisect.bisect_right(completions,row['wall_epoch_ms'])-1
        if i < 0:
            raise ValueError('missing backend observation before browser sample')
        p = ordered[i]
        age = [row['wall_epoch_ms']-p['query_completed_epoch_ms'], row['wall_epoch_ms']-p['query_started_epoch_ms']]
        ages.append(age)
        aligned.append({'wall_epoch_ms':row['wall_epoch_ms'], 'produced_last_observed':ticks(p),
                        'backend_observation_age_ms_bounds':age,
                        'admitted':row['admitted_ticks'], 'displayed':row['played_ticks'],
                        'buffer':row['buffer_ticks']})
    phases = {p:sum(r['phase']==p for r in rows) for p in sorted({r['phase'] for r in rows})}
    checks = {
        'rates':all(.9 <= x <= 1.15 for x in [admitted/seconds,displayed/seconds,*[n/seconds for n in produced_bounds]]),
        'no_stall_or_rebuffer':all(p in ['PLAYING','DEGRADED_BUFFER'] for p in phases),
        'no_resynchronization':all(r['resyncs']==first['resyncs'] for r in rows),
        'normal_not_performance_limited':all(r['target_rate']==1 and r['nominal_rate']==1 and not r['performance_limited'] for r in rows),
        'buffer_accounting':abs(conservation_error)<1e-5,
        'bounded_queue':all(r['queue_segments']<=24 and r['buffer_bytes']<=8*1024*1024 for r in rows),
        'no_sustained_buffer_deficit':mean_change>=-1 and slope>=-1/seconds,
    }
    summary = {'status':'PASS' if all(checks.values()) else 'FAIL','seconds':seconds,'checks':checks,
               'production_endpoint_tick_bounds':{'start':start_bounds,'end':end_bounds},
               'produced_ticks_bounds':produced_bounds,'produced_ticks_per_second_bounds':[n/seconds for n in produced_bounds],
               'admitted_ticks':admitted,'displayed_ticks':displayed,
               'admitted_ticks_per_second':admitted/seconds,'displayed_ticks_per_second':displayed/seconds,
               'buffer_start':first['buffer_ticks'],'buffer_end':last['buffer_ticks'],
               'buffer_change':buffer_change,'admitted_minus_displayed':admitted-displayed,
               'buffer_conservation_error':conservation_error,'rolling_buffer_minutes':buckets,
               'buffer_regression_ticks_per_second':slope,'last_three_minus_first_three_minute_mean':mean_change,
               'stability_criterion':'All samples retained. Last three minute means may lose at most one tick versus first three; whole-window regression may lose at most one tick per observation duration. No rebuffering or resync permitted.',
               'backend_observation_age_ms':{'median_upper':statistics.median(a[1] for a in ages),'max_upper':max(a[1] for a in ages)},
               'backend_poll_uncertainty':'Snapshot lies within each timed request; surrounding requests bound endpoint counts. Bounds, not stale browser lab_status counts, qualify production.',
               'phases':phases,'resynchronizations':last['resyncs']-first['resyncs'],
               'performance_limited':any(r['performance_limited'] for r in rows)}
    return summary, aligned
