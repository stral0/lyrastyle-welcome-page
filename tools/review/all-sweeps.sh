#!/bin/bash
cd /home/claude/lyra
node tools/review/sweep.js --w 1280 --h 720 --tag 1280 > shots/rv-log-1280.txt 2>&1
node tools/review/sweep.js --w 1920 --h 1080 --tag 1920 > shots/rv-log-1920.txt 2>&1
node tools/review/sweep.js --w 2200 --h 900 --tag uw > shots/rv-log-uw.txt 2>&1
node tools/review/sweep.js --w 1024 --h 768 --tag 1024 > shots/rv-log-1024.txt 2>&1
node tools/review/sweep.js --w 844 --h 390 --mobile --tag land > shots/rv-log-land.txt 2>&1
node tools/review/sweep.js --w 1440 --h 900 --lang en --tag en > shots/rv-log-en.txt 2>&1
node tools/review/sweep.js --mobile --lang en --tag men > shots/rv-log-men.txt 2>&1
node tools/review/sweep.js --w 1440 --h 900 --rm --tag rm > shots/rv-log-rm.txt 2>&1
echo done > shots/rv-log-done.txt
