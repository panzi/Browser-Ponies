#!/usr/bin/env python

import os
import re
import sys
import argparse
import hashlib
import urllib

BUFFER_SIZE = 1024 * 1024

def readchunks(f):
	while 1:
		chunk = f.read(BUFFER_SIZE)
		
		if not chunk:
			break
		
		yield chunk

def dupsets(files,hashfunc):
	sets = {}
	for filename in files:
		h = hashfunc(filename)
		if h in sets:
			sets[h].add(filename)
		else:
			sets[h] = set([filename])
	for h in sets.keys():
		if len(sets[h]) < 2:
			del sets[h]
	return sets

def hash_md5(filename):
	chk = hashlib.md5()
	with open(filename,'rb') as f:
		for chunk in readchunks(f):
			chk.update(chunk)
	return chk.digest()

def icmp(it1,it2):
	it1, it2 = iter(it1), iter(it2)
	firstend = False
	
	while 1:
		try:
			v1 = it1.next()
			
		except StopIteration:
			firstend = True
		
		try:
			v2 = it2.next()
			
			if firstend:
				return -1
			
		except StopIteration:
			if firstend:
				return 0
			
			else:
				return 1
		
		c = cmp(v1,v2)
		
		if c != 0:
			return c

def fcmp(filename1,filename2):
	if os.path.samefile(filename1,filename2):
		return 0
	with open(filename1,"rb") as f1:
		with open(filename2,"rb") as f2:
			return icmp(readchunks(f1),readchunks(f2))

def real_dupsets(files):
	sets = []
	for i in xrange(len(files)):
		filename = files[i]
		collision_set = set()
		collision_set.add(filename)
		for j in xrange(i+1,len(files)):
			otherfile = files[j]
			if fcmp(filename,otherfile) == 0:
				collision_set.add(otherfile)
		if len(collision_set) > 1:
			sets.append(collision_set)
	return sets

def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("dirs",metavar="DIR",nargs="*",default=["."])
	parser.add_argument("-m","--map-file",default="filemap")
	parser.add_argument("-a","--htaccess",default=".htaccess")
	parser.add_argument("-p","--prefix",default="")
	args = parser.parse_args()
	
	files = []
	for directory in args.dirs:
		for root, subdirs, subfiles in os.walk(directory):
			for filename in subfiles:
				files.append(os.path.join(root,filename))

	bysize = dupsets(files,os.path.getsize)
	sets = []
	for size in bysize:
		sized = bysize[size]
		if len(sized) == 2:
			sets.extend(real_dupsets(list(sized)))
		else:
			byhash = dupsets(sized,hash_md5)
			for h in byhash:
				sets.extend(real_dupsets(list(byhash[h])))

	with open(args.htaccess,"w") as f:
		f.write(
			"RewriteEngine On\n"
			"RewriteMap filemap txt:%s\n"
			"RewriteRule %s(.*) ${filemap:$1|$1} [R]\n" %
			(args.map_file, re.escape(args.prefix)))

	with open(args.map_file,"w") as f:
		for dupset in sets:
			dupset = list(dupset)
			dupset.sort()
			target = args.prefix+urllib.quote(dupset[0])
			for filename in dupset[1:]:
				f.write("%s %s\n" % (urllib.quote(filename), target))

if __name__ == '__main__':
	main()
