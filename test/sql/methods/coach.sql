select 
    profile ->> '$.medical.fit' as fit,
    profile -> '$.medical.nested.test' as test,
    profile -> '$.tests' as tests,
    profile
from coaches