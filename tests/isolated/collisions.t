No collisions:

  $  ringpop-admin collisions 127.0.0.1:3000
  no membership collisions!
   (re)
   (re)
  no replica collisions!
   (re)
   (re)

Forces collision:
  $  $PROG_RINGPOP --listen=127.0.0.1:30001 --hosts="$PACKAGE_DIR/tests/hosts.json" &>/dev/null &
  $  pid_ringpop=$!
  $  sleep 5
  $  ringpop-admin collisions 127.0.0.1:30001
  no membership collisions!
  
  
  replica collisions:  10
   hash         address           # replica   collision        # replica 
   948751649    127.0.0.1:30001   0           127.0.0.1:3000   10        
   1384781585   127.0.0.1:30001   1           127.0.0.1:3000   11        
   3729262703   127.0.0.1:30001   2           127.0.0.1:3000   12        
   1095778222   127.0.0.1:30001   3           127.0.0.1:3000   13        
   2551079674   127.0.0.1:30001   4           127.0.0.1:3000   14        
   2388901873   127.0.0.1:30001   5           127.0.0.1:3000   15        
   2807910490   127.0.0.1:30001   6           127.0.0.1:3000   16        
   3537705259   127.0.0.1:30001   7           127.0.0.1:3000   17        
   3798759208   127.0.0.1:30001   8           127.0.0.1:3000   18        
   1592015044   127.0.0.1:30001   9           127.0.0.1:3000   19        
   (re)
   (re)
  [1]

  $  kill $pid_ringpop
