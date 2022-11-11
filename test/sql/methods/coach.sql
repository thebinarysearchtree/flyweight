select 
    profile ->> '$.medical.fit' as fit,
    profile -> '$.medical.nested.test[1]' as test,
    profile -> '$.tests' as tests,
    profile
from coaches where profile is not null