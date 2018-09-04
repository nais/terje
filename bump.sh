#!/usr/bin/env bash
old=$(< version)
new=$(($old + 1))
echo "$new"
echo "$new" > version
