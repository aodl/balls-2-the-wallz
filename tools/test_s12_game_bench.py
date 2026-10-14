import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ChainedIntervals(unittest.TestCase):
    def test_declared_intervals_execute_and_chain(self):
        fixture=json.loads((ROOT/'benchmarks/s12/workloads.json').read_text())
        fixture['workloads']=[r for r in fixture['workloads'] if r['segments']>1]
        with tempfile.TemporaryDirectory() as directory:
            input_path=Path(directory)/'fixture.json';output=Path(directory)/'result.json'
            input_path.write_text(json.dumps(fixture))
            subprocess.run(['node','tools/s12_game_bench.mjs',str(input_path),str(output),'1'],cwd=ROOT,check=True,capture_output=True,timeout=60)
            document=json.loads(output.read_text())
            coordinator=document['multi_segment_coordinator'][0]
            self.assertEqual(coordinator['executed_segments'],8)
            self.assertEqual(coordinator['publications'][-1]['retained_segments'],3)
            self.assertEqual(len({r['publication_hash'] for r in coordinator['publications']}),8)
            for row in document['rows']:
                self.assertEqual(row['executed_segments'],8)
                self.assertEqual(len(row['intervals']),8)
                for before,after in zip(row['intervals'],row['intervals'][1:]):
                    self.assertEqual(before['output_hashes']['state'],after['input_state_hash'])
                    self.assertEqual(before['logical_end'],after['logical_start'])
