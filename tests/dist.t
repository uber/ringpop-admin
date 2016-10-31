Test dist output:

  $  ringpop-admin dist 127.0.0.1:3000
   address          percentage 
   \x1b[35m127.0.0.1:3000\x1b[39m   20.03%      (esc)
   127.0.0.1:3001   19.5%      
   127.0.0.1:3002   \x1b[32m23.14%\x1b[39m      (esc)
   127.0.0.1:3003   \x1b[33m18.63%\x1b[39m      (esc)
   127.0.0.1:3004   18.7%      

Test dist outputi with sevnup keys:

  $  ringpop-admin dist --sevnup 4096 127.0.0.1:3000
   address          percentage   keys   keys percentage 
   \x1b[35m127.0.0.1:3000\x1b[39m   20.03%       817    19.95%           (esc)
   127.0.0.1:3001   19.5%        838    20.46%          
   127.0.0.1:3002   \x1b[32m23.14%\x1b[39m       \x1b[32m968\x1b[39m    \x1b[32m23.63%\x1b[39m           (esc)
   127.0.0.1:3003   \x1b[33m18.63%\x1b[39m       \x1b[33m735\x1b[39m    \x1b[33m17.94%\x1b[39m           (esc)
   127.0.0.1:3004   18.7%        738    18.02%          

Test dist output with a keys file:

  $  ringpop-admin dist --file /$TESTDIR/keys 127.0.0.1:3000
   address          percentage   keys   keys percentage 
   \x1b[35m127.0.0.1:3000\x1b[39m   20.03%       41     20.5%            (esc)
   127.0.0.1:3001   19.5%        35     17.5%           
   127.0.0.1:3002   \x1b[32m23.14%\x1b[39m       \x1b[32m48\x1b[39m     \x1b[32m24%\x1b[39m              (esc)
   127.0.0.1:3003   \x1b[33m18.63%\x1b[39m       45     22.5%            (esc)
   127.0.0.1:3004   18.7%        \x1b[33m31\x1b[39m     \x1b[33m15.5%\x1b[39m            (esc)

Test dist output with both sevnup and a keys file:

  $  ringpop-admin dist --file /$TESTDIR/keys --sevnup 4069 127.0.0.1:3000
   address          percentage   keys   keys percentage 
   \x1b[35m127.0.0.1:3000\x1b[39m   20.03%       850    19.91%           (esc)
   127.0.0.1:3001   19.5%        869    20.36%          
   127.0.0.1:3002   \x1b[32m23.14%\x1b[39m       \x1b[32m1010\x1b[39m   \x1b[32m23.66%\x1b[39m           (esc)
   127.0.0.1:3003   \x1b[33m18.63%\x1b[39m       777    18.2%            (esc)
   127.0.0.1:3004   18.7%        \x1b[33m763\x1b[39m    \x1b[33m17.87%\x1b[39m           (esc)
