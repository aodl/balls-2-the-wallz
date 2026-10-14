import copy
import json
import unittest
from pathlib import Path
from benchmark_s12 import sha256
from s13_analysis import CONFIG, cases
from s13_cost_model import project

ROOT=Path(__file__).resolve().parents[1]

class PolicyCost(unittest.TestCase):
    def setUp(self):
        self.assumptions=json.loads((ROOT/'benchmarks/s13/cost-assumptions.json').read_text())
        self.binding=dict(source={'revision':'test','dtr_revision':'71e59e93cf49a3656689679b538b4c3f138787f8'},normal_wasm_sha256=self.assumptions['reuse_instructions']['normal_wasm_sha256'],workload_sha256='workload',harness_sha256='harness',runtime_sha256='runtime',model_configuration_sha256=sha256(ROOT/'benchmarks/s13/cost-assumptions.json'))
        self.traces=[]
        for spec in cases('smoke'):
            spec.update(arrival_batch=0)
            rows=[dict(ledger_tip=0,verified_cursor=0,new_arrivals=0,records_verified=0,backlog=0,ledger_calls=i//spec['fallback_seconds'],archive_calls=0,elapsed_virtual_seconds=i,source_error=None,run_error=None,empty_polls_observed=i//spec['fallback_seconds'],callbacks=i,completed_segments=3) for i in range(1,33)]
            self.traces.append(dict(**self.binding,schema='btz-s13-case-v1',status='PASS',case=spec,configuration=CONFIG,trace=rows,native_replay=dict(status='PASS',segments=3,own_history=True),publications=[dict(input_count=0)]*3,latency=[],initial_world_sha256='world',ledger_fixture_sha256='fixture',stable_bytes_final=25231360))
    def test_counts_drive_idle_increment(self):
        result=project(self.traces,self.assumptions,self.binding)
        one,five=result['scenarios']
        self.assertGreater(one['polling_cycles_per_day'],five['polling_cycles_per_day'])
        self.assertEqual(one['game_instruction_cycles_per_day_sample_range'],five['game_instruction_cycles_per_day_sample_range'])
        self.assertEqual(one['storage_cycles_per_day'],five['storage_cycles_per_day'])
    def test_source_mismatch_rejected(self):
        self.traces[0]['source']['revision']='stale'
        # Break shared dict reference deliberately, as in a supplied serialized artifact.
        binding=copy.deepcopy(self.binding);binding['source']['revision']='test'
        with self.assertRaises(ValueError):project(self.traces,self.assumptions,binding)
    def test_changed_wasm_blocks_instruction_reuse(self):
        self.binding['normal_wasm_sha256']='changed'
        with self.assertRaises(ValueError):project(self.traces,self.assumptions,self.binding)
    def test_missing_measurements_cannot_zero(self):
        self.assumptions['reuse_instructions']['manifest']='missing.json'
        with self.assertRaises(ValueError):project(self.traces,self.assumptions,self.binding)
    def test_configuration_rejected(self):
        self.assumptions['model']['work_budget']=256
        with self.assertRaises(ValueError):project(self.traces,self.assumptions,self.binding)
    def test_empty_pairs_rejected(self):
        with self.assertRaises(ValueError):project([],self.assumptions,self.binding)
