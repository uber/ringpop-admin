Test ringpop-admin heal on unsupported ringpop:

  $  ringpop-admin heal 127.0.0.1:3000
  Error: no such endpoint service="ringpop" endpoint="/admin/healpartition/disco"
  [1]
Test ringpop-admin heal on unsupported ringpop (verbose):

  $  ringpop-admin heal --verbose 127.0.0.1:3000
  Error: no such endpoint service="ringpop" endpoint="/admin/healpartition/disco"
  [1]
