Partitions command success:

  $  ringpop-admin partitions 127.0.0.1:3000
   *:*:*.* *Checksum*# Nodes*# Alive*# Suspect*# Faulty*Sample Host* (glob)
   *5*5*0*0*127.0.0.1:3000* (glob)

Partitions with '--wait' command success:
  $  $( (which timeout || which gtimeout) ) 3 ringpop-admin partitions -w 1 127.0.0.1:3000 | awk 'NR < 5 { print; }'
   *:*:*.* *Checksum*# Nodes*# Alive*# Suspect*# Faulty*Sample Host* (glob)
   *5*5*0*0*127.0.0.1:3000* (glob)
   *:*:*.* *Checksum*# Nodes*# Alive*# Suspect*# Faulty*Sample Host* (glob)
   *5*5*0*0*127.0.0.1:3000* (glob)

With explicit ringpop:

  $  ringpop-admin partitions ringpop://127.0.0.1:3000
   *:*:*.* *Checksum*# Nodes*# Alive*# Suspect*# Faulty*Sample Host* (glob)
   *5*5*0*0*127.0.0.1:3000* (glob)

With bootstrap file:

  $  ringpop-admin partitions file://$TESTDIR/hosts.json
   *:*:*.* *Checksum*# Nodes*# Alive*# Suspect*# Faulty*Sample Host* (glob)
   *5*5*0*0*127.0.0.1:* (glob)

Unable to connect to host:

  $ ringpop-admin partitions 0.0.0.1:2999
  Error: Failed to connect to ringpop listening on 0.0.0.1:2999.
  [1]


Provide hint if the user tries and fails to connect to localhost or 127.0.0.1

  $  ringpop-admin partitions 127.0.0.1:2999
  Error: Failed to connect to ringpop listening on 127.0.0.1:2999. Ringpop ordinarily does not listen on the loopback interface. Try a different IP address.
  [1]

  $  ringpop-admin partitions localhost:2999
  Error: Expected an ip:port, hostnames are not allowed.
  [1]
