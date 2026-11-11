"""Cold uncertainty, kept separate from frozen Normal measurement/assertions."""
import math


def cold_cadence_ready(row):
    period=row['elastic']['expected_period_seconds']
    return (row['phase'] in ['PLAYING','DEGRADED_BUFFER']
            and row['elastic']['samples']>=2 and period is not None
            and math.isfinite(period) and period>0)


def cold_startup_summary(rows):
    """Keep all cold samples; this never substitutes for steady qualification.

    Before cadence exists, policy deliberately uses nominal pace. A first usable
    interval may exhaust before an unknown next arrival. Only zero-coverage waits
    before cadence are legitimate here; established-cadence stalls remain failures.
    """
    assert rows and rows[0]['phase'] in ['PLAYING','DEGRADED_BUFFER']
    previous=rows[0];exhaustions=0
    for row in rows:
        assert all(math.isfinite(row[k]) for k in ['wall_ms','consumed_ticks','verified_ticks','buffer_ticks'])
        assert row['wall_ms']>=previous['wall_ms']
        assert previous['consumed_ticks']<=row['consumed_ticks']<=row['verified_ticks']
        assert row['verified_ticks']>=previous['verified_ticks']
        assert row['buffer_ticks']>=0 and abs(row['buffer_ticks']-(row['verified_ticks']-row['consumed_ticks']))<1e-7
        assert row['resyncs']==rows[0]['resyncs']
        assert row['delivery_failures']==0 and not row['delivery_error']
        assert row['phase'] in ['PLAYING','DEGRADED_BUFFER','STALLED']
        if row['phase']=='STALLED':
            assert row['elastic']['samples']<2 and row['elastic']['expected_period_seconds'] is None
            assert row['buffer_ticks']==0 and row['consumed_ticks']==row['verified_ticks']
            exhaustions+=1
        previous=row
    assert cold_cadence_ready(rows[-1])
    return {'status':'PASS','scope':'Cold first-motion/cadence acquisition, not the 120-second steady no-stall gate',
            'seconds':(rows[-1]['wall_ms']-rows[0]['wall_ms'])/1000,
            'samples':len(rows),'pre_cadence_exhaustion_samples':exhaustions}

