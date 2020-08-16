#!/bin/bash

exist () {
	which "$1" > /dev/null
	return $?
}

for i in convert montage wget oppai; do
	exist $i || { echo "$i not found"; exit 1; }
done

for i in osu.db cred.js; do
	if [ ! -f $i ]; then
		echo "$i not found. Please check out the example file of $i.";
		exit;
	fi
done

npm i

git pull
node index.js $@
