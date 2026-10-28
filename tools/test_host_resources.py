import unittest
from sample_host_resources import quiet

def samples():
 return [{'cpu_idle_fraction':.9,'memory_kib':{'MemAvailable:':3*1024*1024},'swap_out_pages':0,'pressure':{'cpu':{'some':{'avg10':1}},'io':{'full':{'avg10':0}}},'process_cpu_cores':{},'cgroups':{'test':{'cpu_stat':{'throttled_usec':0}}}}for _ in range(12)]
class Screen(unittest.TestCase):
 def test_criteria_accept_quiet_and_reject_busy_without_changing_thresholds(self):
  self.assertTrue(quiet(samples())[0])
  for mutate in [lambda x:x.update(cpu_idle_fraction=.1),lambda x:x['process_cpu_cores'].update({'7':{'name':'rustc','cores':.05}}),lambda x:x['pressure']['cpu']['some'].update(avg10=80),lambda x:x['cgroups']['test']['cpu_stat'].update(throttled_usec=1)]:
   rows=samples();mutate(rows[-1]);self.assertFalse(quiet(rows)[0])
 def test_owned_descendants_are_not_confused_with_foreign_work(self):
  from run_matched_delivery import foreign_work
  s={'processes':{'1':{'parent_pid':0,'process_group':1},'2':{'parent_pid':1,'process_group':1},'3':{'parent_pid':0,'process_group':3}},'process_cpu_cores':{'2':{'name':'pocket-ic','cores':1},'3':{'name':'rustc','cores':1}}}
  self.assertEqual([x['pid']for x in foreign_work(s,[1])],['3'])
 def test_no_history_is_not_a_pass(self):self.assertFalse(quiet([])[0])
if __name__=='__main__':unittest.main()
