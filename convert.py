#!/usr/bin/env python

import re
import os
import json
#import chardet
import codecs
import urllib

if os.path.sep != '/':
	def normpath(path):
		return "/".join(path.split(os.path.sep))
else:
	def normpath(path):
		return path

IGNORE = re.compile("^\\s*(?:'.*)?\r?\n", re.M)
CODEC  = re.compile("^BOM_(.*?)(?:_(?:BE|LE))?$")

BOMS = list(set(unicode(getattr(codecs, name),CODEC.match(name).group(1))
	for name in dir(codecs) if name.startswith('BOM_UTF')))
BOMS.sort(key=lambda bom:-len(bom))

def decode(s):
#	s = unicode(s,chardet.detect(s)['encoding'])
	s = unicode(s,"utf8")
	for bom in BOMS:
		if s.startswith(bom):
			s = s[len(bom):]
			break
	return s

def convert(files,out):
	ponies = []
	for filepath in files:
		dirname, filename = os.path.split(filepath)
		with open(filepath,'rb') as f:
			data = IGNORE.sub("", decode(f.read())).replace("\r\n","\n")
			ponies.append({'ini': data, 'baseurl': urllib.quote(normpath(dirname)+"/")})
	json.dump(ponies,out)
	out.write("\n")

if __name__ == '__main__':
	import sys
	convert(sys.argv[1:],sys.stdout)
