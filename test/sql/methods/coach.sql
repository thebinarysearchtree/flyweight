select 
    profile ->> '$.medical.fit' as fit,
    profile -> '$.tests' as tests
from coaches