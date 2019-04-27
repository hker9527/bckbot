#!/bin/bash

exist () {
	which "$1" > /dev/null
	return $?
}

for i in convert montage wget oppai; do
	exist "$i" || (echo "$i not found"; exit)
done

for i in osu.db cred.js; do
	if [ ! -f $i ]; then
		echo "$i not found. Please check out the example file of $i.";
		exit;
	fi
done

npm i

for i in "pc/jp.json pc/tw.json"; do
	if [ ! -f "$i" ]; then
		cd pc
		node index.js
		cd ..
	fi
done

git pull
node index.js
