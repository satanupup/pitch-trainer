#!/bin/bash
cd /var/www/pitch-trainer
pm2 restart ai-resource-maker || pm2 start server.js --name ai-resource-maker
pm2 save

