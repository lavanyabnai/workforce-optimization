import json

fixtures = [
    'app/fixtures/stores.json',
    'app/fixtures/employees.json',
    'app/fixtures/scenarios.json',
    'app/fixtures/labor_standards.json'
]

for f in fixtures:
    data = json.load(open(f))
    count = len(data) if isinstance(data, list) else 'object'
    print(f'OK {f} ({count} records)')

# Validate headline scenario numbers
scenarios = json.load(open('app/fixtures/scenarios.json'))
headline = next(s for s in scenarios if s['id'] == 'PLAN-2026-Q1-WAGE')
out = headline['scenario_outputs']
assert out['total_hours'] == 161200, 'hours mismatch'
assert out['total_wages'] == 2460000, 'wages mismatch'
assert out['labor_pct'] == 15.0, 'labor_pct mismatch'
print('OK headline numbers: 161,200 hrs / $2,460,000 / 15.0%')

# Validate stores distribution
stores = json.load(open('app/fixtures/stores.json'))
west = sum(1 for s in stores if s['region'] == 'West')
central = sum(1 for s in stores if s['region'] == 'Central')
east = sum(1 for s in stores if s['region'] == 'East')
assert west == 38 and central == 32 and east == 30, f'W={west} C={central} E={east}'
print(f'OK stores distribution: W={west} C={central} E={east}')

s0001 = next(s for s in stores if s['id'] == 'S-0001')
assert s0001['name'] == 'Sunnyvale Plaza'
assert s0001['hours_open']['type'] == '24/7'
print('OK S-0001 Sunnyvale Plaza verified')

# Validate employees roles
employees = json.load(open('app/fixtures/employees.json'))
roles = set(e['role'] for e in employees)
expected = {'Store Manager','Shift Lead','Cashier','Sales Associate','Food Service','Coffee Bar','7NOW Driver'}
assert roles == expected, f'Missing roles: {expected - roles}'
print(f'OK employees: {len(employees)} employees, all 7 roles covered')

print('ALL CHECKS PASSED')
